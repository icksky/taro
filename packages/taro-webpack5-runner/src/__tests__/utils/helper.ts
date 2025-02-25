import ReactLikePlugin from '@tarojs/plugin-framework-react'
import Vue2Plugin from '@tarojs/plugin-framework-vue2'
import Vue3Plugin from '@tarojs/plugin-framework-vue3'
import { IFs } from 'memfs'
import joinPath from 'memory-fs/lib/join'
import path from 'path'

import { componentConfig } from '../../utils/component'

import type { CommonBuildConfig, H5BuildConfig, MiniBuildConfig } from '../../utils/types'

interface EnsuredFs extends IFs {
  join: () => string
}

export function ensureWebpackMemoryFs (fs: IFs): EnsuredFs {
  const newFs: EnsuredFs = Object.create(fs)
  newFs.join = joinPath

  return newFs
}

function readDir (fs: IFs, dir: string) {
  let files: string[] = []
  const list = fs.readdirSync(dir)
  list.forEach(item => {
    const filePath = path.join(dir, item)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      files = files.concat(readDir(fs, filePath))
    } else {
      files.push(filePath)
    }
  })
  return files
}

export function getOutput<T extends MiniBuildConfig | H5BuildConfig = CommonBuildConfig> (stats, config: Partial<T>) {
  const fs: IFs = stats.compilation.compiler.outputFileSystem

  const files = readDir(fs, config.outputRoot as string)
  const output = files.reduce((content, file) => {
    return `${content}
/** filePath: ${file} **/
${fs.readFileSync(file)}
`
  }, '')
  return output
}

export /**
* 处理不同框架的自定义逻辑
* @param chain webpack-chain
*/
function frameworkPatch (chain, webpack, config) {
  const mockCtx = {
    initialConfig: {
      framework: config.framework || 'react'
    },
    modifyWebpackChain: cb => cb({ chain, webpack, data: { componentConfig } }),
    modifyRunnerOpts: cb => cb(config),
    onParseCreateElement: cb => cb({ nodeName: '', componentConfig })
  }

  let frameworkPlugin: any = ReactLikePlugin
  switch (config.framework) {
    case 'vue':
      config.opts = {}
      frameworkPlugin = Vue2Plugin
      break
    case 'vue3':
      config.opts = {}
      frameworkPlugin = Vue3Plugin
      break
  }

  frameworkPlugin(mockCtx)
}
