import type { Failure, InferErr, InferOk, Result, Simplify } from "@monstermann/stdlib"
import type { CLI } from "../CLI"

export type InferClient<X> = X extends { config: { commands: infer C, options: infer O } }
    ? keyof RPCCommands<C> extends never
        ? RPCAction<X, O>
        : RPCAction<X, O> & RPCCommands<C>
    : never

type RPCCommands<C> = Simplify<{ -readonly [K in keyof C as RPCHasAction<C[K]> extends true ? K : never]: InferClient<C[K]> }>

type RPCAction<X, O> = X extends CLI.ActionCommand<any, any, infer R>
    ? (options: RPCOptions<O>) => Promise<Result<RPCValue<R>, RPCError<R> | CLI.Error | CLI.InvalidMessageError>>
    : unknown

type RPCValue<R> = InferOk<Exclude<R, void>> | (undefined extends R ? null : never)

type RPCError<R> = InferErr<Exclude<R, void>> extends infer E ? E extends Failure ? E : Failure : never

type RPCHasAction<X> = X extends { config: { action: infer A, commands: infer C } }
    ? A extends undefined
        ? true extends { [K in keyof C]: RPCHasAction<C[K]> }[keyof C]
            ? true
            : false
        : true
    : false

type RPCOptions<O> = Simplify<
    & { -readonly [K in keyof O as RPCRequired<O[K]> extends true ? K : never]: RPCOption<O[K]> }
    & { -readonly [K in keyof O as RPCRequired<O[K]> extends true ? never : K]?: RPCOption<O[K]> }
>

type RPCOption<O> = O extends CLI.StringOption<unknown, boolean, boolean>
    ? string
    : O extends CLI.BooleanOption
        ? boolean
        : O extends CLI.EnumOption<infer K, boolean>
            ? K
            : never

type RPCRequired<O> = O extends CLI.StringOption<unknown, infer Optional, infer Defaulted>
    ? Optional extends true
        ? false
        : Defaulted extends true
            ? false
            : true
    : O extends CLI.EnumOption<infer _K, infer Defaulted>
        ? Defaulted extends true
            ? false
            : true
        : false
