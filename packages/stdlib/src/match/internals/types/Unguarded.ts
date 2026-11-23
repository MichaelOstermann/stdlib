export type Unguarded<Input, F> = F extends (value: any) => value is infer I ? Exclude<Input, I> : Input
