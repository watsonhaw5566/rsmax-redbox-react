import {defineConfig} from "@rslib/core";
import { pluginReact } from '@rsbuild/plugin-react';


export default defineConfig({
    lib: [
        {
            format: 'cjs',
            output: {
                target: 'node',
                distPath: {
                    root: './lib',
                },
                externals:{
                    react:'react'
                }
            },
        },
    ],
    plugins:[
        pluginReact(),
    ],
})
