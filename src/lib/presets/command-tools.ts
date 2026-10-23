import { presetTagId, type PresetTagKey } from '@/lib/presets/tags';
import type { CommandTool } from '@/lib/workspace';

/** 预设命令工具的内部 ID。标识含有不便放进 ID 的字符时（如 `g++`、`./gradlew`），用 `slug` 指定 ID 后缀。 */
export function presetCommandId(slug: string): string {
  return `preset-command-${slug}`;
}

function command(
  key: string,
  description: string,
  tags: PresetTagKey[],
  options: { highRisk?: boolean; slug?: string } = {}
): CommandTool {
  return {
    id: presetCommandId(options.slug ?? key),
    key,
    description,
    tag_ids: tags.map(presetTagId),
    high_risk: options.highRisk ?? false,
  };
}

const HIGH_RISK = { highRisk: true };

/*
 * 预设命令工具。内部 ID 是固定值，“合并预设”按它判断条目是否已存在。
 * 来源是 Claude Code 与 Antigravity 两份实际配置中命令的并集，并按正确性整理：
 * 不收录不是真实命令名的条目（`ripgrep` 的命令是 `rg`，`tealdeer` 的命令是 `tldr`），
 * 不收录指向个人安装位置的写法（`~/.local/bin/mise` 与 `mise` 是同一个程序），
 * 另外补上 spec 列出的高危命令 `dd`、`mkfs`、`chmod`、`chown`。
 * 标签按社区通行的用途大致分配，一个命令可以有多个标签。
 */
export const PRESET_COMMAND_TOOLS: CommandTool[] = [
  // 版本控制
  command('git', '版本控制', ['vcs']),
  command('gh', 'GitHub 命令行', ['vcs', 'network']),

  // 包管理与语言工具链
  command('npm', 'Node.js 包管理', ['package-manager']),
  command('npx', '运行 npm 包中的命令', ['package-manager']),
  command('pnpm', 'Node.js 包管理', ['package-manager']),
  command('pnpx', '运行 npm 包中的命令（pnpm）', ['package-manager']),
  command('yarn', 'Node.js 包管理', ['package-manager']),
  command('yarnpkg', 'yarn 的别名', ['package-manager']),
  command('corepack', '管理 Node.js 包管理器的版本', ['package-manager']),
  command('nrm', '切换 npm 镜像源', ['package-manager', 'network']),
  command('node', 'Node.js 运行时', ['build']),
  command('tsc', 'TypeScript 编译器', ['build']),
  command('eslint', 'JavaScript 代码检查', ['build']),
  command('prettier', '代码格式化', ['build']),
  command('vite', '前端构建与开发服务器', ['build']),
  command('vitest', 'JavaScript 测试', ['build']),
  command('jest', 'JavaScript 测试', ['build']),
  command('pip', 'Python 包管理', ['package-manager']),
  command('pip3', 'Python 3 包管理', ['package-manager']),
  command('uv', 'Python 包与项目管理', ['package-manager']),
  command('uvx', '运行 Python 包中的命令', ['package-manager']),
  command('python', 'Python 解释器', ['build']),
  command('python3', 'Python 3 解释器', ['build']),
  command('java', 'Java 运行时', ['build']),
  command('javac', 'Java 编译器', ['build']),
  command('mvn', 'Maven 构建', ['build', 'package-manager']),
  command('./mvnw', '项目自带的 Maven Wrapper', ['build', 'package-manager'], { slug: 'mvnw' }),
  command('gradle', 'Gradle 构建', ['build', 'package-manager']),
  command('./gradlew', '项目自带的 Gradle Wrapper', ['build', 'package-manager'], { slug: 'gradlew' }),
  command('go', 'Go 工具链', ['build', 'package-manager']),
  command('cargo', 'Rust 构建与包管理', ['build', 'package-manager']),
  command('rustc', 'Rust 编译器', ['build']),
  command('swift', 'Swift 工具链', ['build']),
  command('xcodebuild', 'Xcode 项目构建', ['build']),
  command('xcode-select', '切换 Xcode 命令行工具', ['build']),
  command('gcc', 'C 编译器', ['build']),
  command('g++', 'C++ 编译器', ['build'], { slug: 'gpp' }),
  command('clang', 'C/C++ 编译器', ['build']),
  command('make', '按 Makefile 构建', ['build']),
  command('cmake', '生成构建系统', ['build']),
  command('nm', '列出目标文件的符号', ['build']),
  command('objdump', '查看目标文件的内容', ['build']),
  command('strings', '提取二进制文件中的可读字符串', ['build', 'text']),
  command('shellcheck', 'Shell 脚本检查', ['build']),
  command('hyperfine', '命令基准测试', ['build']),
  command('mise', '管理开发语言运行时版本', ['package-manager']),
  command('apt-cache', '查询 APT 软件包信息', ['package-manager', 'system']),
  command('dpkg', 'Debian 软件包管理', ['package-manager', 'system']),

  // 容器
  command('docker', '容器管理', ['container']),
  command('podman', '容器管理', ['container']),

  // 搜索
  command('grep', '按内容搜索文本', ['search', 'text']),
  command('egrep', '按扩展正则搜索文本', ['search', 'text']),
  command('fgrep', '按固定字符串搜索文本', ['search', 'text']),
  command('rg', '按内容搜索文件（ripgrep）', ['search']),
  command('ast-grep', '按语法树搜索和改写代码', ['search']),
  command('find', '按条件查找文件', ['search', 'filesystem']),
  command('fd', '按名称查找文件', ['search', 'filesystem']),
  command('fdfind', 'fd 在 Debian 系上的命令名', ['search', 'filesystem']),
  command('which', '查找命令所在位置', ['search']),
  command('whereis', '查找命令及其手册的位置', ['search']),
  command('type', '显示命令的类型', ['search']),
  command('tldr', '查看命令的常用示例（tealdeer 等实现）', []),
  command('tokei', '统计代码行数', []),

  // 文件系统
  command('cd', '切换目录', ['filesystem']),
  command('pwd', '显示当前目录', ['filesystem']),
  command('ls', '列出目录内容', ['filesystem']),
  command('dir', '列出目录内容', ['filesystem']),
  command('tree', '以树形列出目录', ['filesystem']),
  command('file', '识别文件类型', ['filesystem']),
  command('stat', '显示文件状态', ['filesystem']),
  command('du', '统计目录占用空间', ['filesystem']),
  command('df', '查看磁盘空间', ['filesystem', 'system']),
  command('realpath', '解析绝对路径', ['filesystem']),
  command('readlink', '读取符号链接', ['filesystem']),
  command('basename', '取路径中的文件名', ['filesystem']),
  command('dirname', '取路径中的目录', ['filesystem']),
  command('mkdir', '创建目录', ['filesystem']),
  command('touch', '创建文件或更新时间戳', ['filesystem']),
  command('cp', '复制文件', ['filesystem']),
  command('mv', '移动或重命名文件', ['filesystem']),
  command('ln', '创建链接', ['filesystem']),
  command('rm', '删除文件', ['filesystem'], HIGH_RISK),
  command('chmod', '修改文件权限', ['filesystem'], HIGH_RISK),
  command('chown', '修改文件所有者', ['filesystem'], HIGH_RISK),
  command('tee', '同时写入文件和标准输出', ['filesystem', 'text']),
  command('diff', '比较文件差异', ['filesystem', 'text']),
  command('cmp', '逐字节比较文件', ['filesystem']),
  command('patch', '应用补丁', ['filesystem', 'text']),
  command('md5', '计算 MD5 校验和（macOS）', ['filesystem']),
  command('md5sum', '计算 MD5 校验和', ['filesystem']),
  command('shasum', '计算 SHA 校验和', ['filesystem']),
  command('sha1sum', '计算 SHA-1 校验和', ['filesystem']),
  command('sha256sum', '计算 SHA-256 校验和', ['filesystem']),
  command('tar', '打包与解包归档', ['filesystem']),
  command('zip', '压缩为 zip', ['filesystem']),
  command('unzip', '解压 zip', ['filesystem']),
  command('gzip', 'gzip 压缩', ['filesystem']),
  command('gunzip', 'gzip 解压', ['filesystem']),
  command('zcat', '查看 gzip 压缩文件的内容', ['filesystem', 'text']),
  command('bzip2', 'bzip2 压缩', ['filesystem']),
  command('xz', 'xz 压缩', ['filesystem']),

  // 文本处理
  command('cat', '输出文件内容', ['text', 'filesystem']),
  command('head', '输出文件开头', ['text', 'filesystem']),
  command('tail', '输出文件末尾', ['text', 'filesystem']),
  command('sed', '流式编辑文本', ['text']),
  command('awk', '按列处理文本', ['text']),
  command('sort', '排序', ['text']),
  command('uniq', '去除相邻的重复行', ['text']),
  command('comm', '比较两个已排序的文件', ['text']),
  command('wc', '统计行数、字数和字节数', ['text']),
  command('tr', '替换或删除字符', ['text']),
  command('cut', '按列截取文本', ['text']),
  command('echo', '输出文本', ['text']),
  command('printf', '格式化输出', ['text']),
  command('base64', 'Base64 编解码', ['text']),
  command('jq', '处理 JSON', ['text']),
  command('yq', '处理 YAML', ['text']),

  // 网络
  command('curl', '发送 HTTP 请求或下载文件', ['network'], HIGH_RISK),
  command('wget', '下载文件', ['network'], HIGH_RISK),
  command('xh', '发送 HTTP 请求', ['network']),
  command('dig', 'DNS 查询', ['network']),
  command('drill', 'DNS 查询', ['network']),
  command('doggo', 'DNS 查询', ['network']),
  command('host', 'DNS 查询', ['network']),
  command('nslookup', 'DNS 查询', ['network']),
  command('ping', '检测网络连通性', ['network']),
  command('mtr', '跟踪网络路由', ['network']),
  command('nc', '建立任意 TCP/UDP 连接（netcat）', ['network'], HIGH_RISK),
  command('socat', '在任意两端之间转发数据', ['network'], HIGH_RISK),
  command('netstat', '查看网络连接', ['network', 'system']),
  command('ss', '查看套接字', ['network', 'system']),
  command('ip', '查看和配置网络接口与路由', ['network', 'system']),
  command('ifconfig', '查看和配置网络接口', ['network', 'system']),

  // 系统
  command('sudo', '以超级用户身份执行', ['system'], HIGH_RISK),
  command('ps', '查看进程', ['system']),
  command('pgrep', '按名称查找进程', ['system', 'search']),
  command('lsof', '查看打开的文件与端口', ['system', 'network']),
  command('uname', '显示系统信息', ['system']),
  command('arch', '显示处理器架构', ['system']),
  command('hostname', '显示主机名', ['system']),
  command('id', '显示用户与用户组', ['system']),
  command('whoami', '显示当前用户名', ['system']),
  command('uptime', '显示运行时间与负载', ['system']),
  command('free', '查看内存使用', ['system']),
  command('printenv', '显示环境变量', ['system']),
  command('date', '显示日期与时间', ['system']),
  command('cal', '显示日历', ['system']),
  command('sleep', '等待一段时间', ['system']),
  command('gpg', '加密与签名', ['system']),

  // 硬件
  command('lscpu', '查看 CPU 信息', ['hardware', 'system']),
  command('lsblk', '查看块设备', ['hardware', 'system']),
  command('lsmod', '查看已加载的内核模块', ['hardware', 'system']),
  command('lspci', '查看 PCI 设备', ['hardware']),
  command('lsusb', '查看 USB 设备', ['hardware']),
  command('bluetoothctl', '管理蓝牙设备', ['hardware']),
  command('btmgmt', '管理蓝牙控制器', ['hardware']),
  command('hciconfig', '配置蓝牙设备', ['hardware']),
  command('rfkill', '启用或禁用无线设备', ['hardware']),
  command('dd', '按块复制数据，可直接写入磁盘', ['hardware', 'filesystem'], HIGH_RISK),
  command('mkfs', '创建文件系统，会清空分区', ['hardware', 'filesystem'], HIGH_RISK),

  // 其他
  command('ffmpeg', '音视频转换与处理', []),
  command('gifsicle', 'GIF 处理', []),
  command('code', '用 VS Code 打开文件或目录', []),
  command('agy', 'Antigravity 命令行', []),
  command('openclaw', 'OpenClaw 命令行', []),
];
