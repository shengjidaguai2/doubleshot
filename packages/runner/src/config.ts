import path from 'path'
import JoyCon from 'joycon'
import { bundleRequire } from 'bundle-require'
import type { Configuration as ElectronBuilderConfiguration } from 'electron-builder'
import type { ConcurrentlyCommandInput } from 'concurrently'
import { greenBright } from 'colorette'
import { normalizePath } from './utils'
import { createLogger } from './log'
import { CONFIG_FILE, TAG } from './constants'

export type DoubleShotRunnerConfigExport = DoubleShotRunnerConfig | Promise<DoubleShotRunnerConfig>

export interface RunConfig {
  /**
   * @default process.cwd()
   */
  cwd?: string
  /**
   * Command name
   */
  name?: string
  /**
   * Terminal color
   */
  prefixColor?: string
  commands?: Record<string, string | (ConcurrentlyCommandInput & {
    command: string
    /**
     * when this command is exited, the other commands will be killed
     * @default false
     */
    killOthersWhenExit?: boolean
  })>
}

export interface ElectronBuildConfig {
  /**
   * @default false
   */
  disabled?: boolean
  /**
   * @default 'build'
   */
  commandName?: string
  /**
  * @default process.cwd()
  */
  projectDir?: string
  /**
   * electron-builder config or electron-builder config file path
   */
  config?: string | ElectronBuilderConfiguration
}

export interface DoubleShotRunnerConfig {
  /**
   * Project root directory. Can be an absolute path, or a path relative from
   * the location of the config file itself.
   * @default process.cwd()
   */
  root?: string
  run?: RunConfig[]
  electronBuild?: ElectronBuildConfig
}

export type ResolvedConfig = Readonly<{
  configFile: string | undefined
} & DoubleShotRunnerConfig>

/**
 * Type helper to make it easier to use dsr.config.ts
 */
export function defineConfig(config: DoubleShotRunnerConfigExport): DoubleShotRunnerConfigExport {
  return config
}

/**
 * Resolve doubleshot runner config
 */
export async function resolveConfig(): Promise<ResolvedConfig> {
  const logger = createLogger()
  const cwd = process.cwd()
  const configJoycon = new JoyCon()
  const configPath = await configJoycon.resolve({
    files: [
      `${CONFIG_FILE}.ts`,
      `${CONFIG_FILE}.js`,
      `${CONFIG_FILE}.cjs`,
      `${CONFIG_FILE}.mjs`,
    ],
    cwd,
    stopDir: path.parse(cwd).root,
  })

  if (configPath) {
    logger.info(TAG, `Using config: ${greenBright(configPath)}\n`)

    const { mod } = await bundleRequire({
      filepath: configPath,
    })

    const config: DoubleShotRunnerConfig = mod.default || mod

    const resolvedRunConfig = resolveRunConfig(config.run, cwd)
    const resolvedElectronBuildConfig = resoleElectronBuilderConfig(config.electronBuild, cwd)

    return {
      root: config.root || cwd,
      configFile: configPath,
      run: resolvedRunConfig,
      electronBuild: resolvedElectronBuildConfig,
    }
  }
  else {
    throw new Error('doubleshot runner needs a config file')
  }
}

function resoleElectronBuilderConfig(buildConfig: ElectronBuildConfig | undefined, cwd: string): ElectronBuildConfig {
  if (!buildConfig)
    return { disabled: true }

  const resolvedProjectDir = normalizePath(path.resolve(cwd, buildConfig.projectDir || ''))
  const resolvedConfig = typeof buildConfig.config === 'string' ? normalizePath(path.resolve(cwd, buildConfig.config)) : buildConfig.config
  return {
    disabled: buildConfig.disabled === true,
    commandName: buildConfig.commandName || 'build',
    projectDir: resolvedProjectDir,
    config: resolvedConfig,
  }
}

function resolveRunConfig(runConfig: RunConfig[] | undefined, cwd: string) {
  if (!runConfig)
    return []

  return runConfig.map((runConfig) => {
    const { cwd: runCwd, name } = runConfig
    const resolvedCwd = normalizePath(path.resolve(cwd, runCwd || ''))
    return {
      ...runConfig,
      cwd: resolvedCwd,
      name: name || path.basename(resolvedCwd),
    }
  })
}
