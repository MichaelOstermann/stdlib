import { plugin } from "bun"
import { stdlibBun } from "./packages/stdlib-transform/src"

plugin(stdlibBun())
