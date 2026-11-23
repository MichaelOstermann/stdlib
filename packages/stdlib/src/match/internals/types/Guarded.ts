// What a predicate tells the value to be: the members of the input it lets through, when there are any.
export type Guarded<Input, F> = F extends (value: any) => value is infer I
    ? [Extract<Input, I>] extends [never]
        ? I & Input
        : Extract<Input, I>
    : Input
