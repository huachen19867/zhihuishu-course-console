# 技术日志

## 2026-09-30 公开版整理

复用Playwright 1.63.0、Windows WinForms、Edge CDP及Codex CLI，没有新增扩展或网页服务。参考 https://github.com/microsoft/playwright 、https://github.com/openai/codex 、https://learn.microsoft.com/en-us/microsoft-edge/devtools/protocol/ 。原有个人技术日志与说明保留在忽略的archive目录。课程ID、运行数据、成绩、登录资料不公开。

新增AGENT_GUIDE.md，要求Agent向用户展示控制台，按账号配置模型。config.cjs、read-config.ps1、config.example.json和model.cjs集中管理课程、CDP与模型。支持国内Agent文件交接、兼容OpenAI Chat Completions的JSON模式和可选已登录Codex CLI，CLI不再硬编码个人安装版本，API密钥仅读取环境变量。文件模式按唯一requestId接收结果，拒绝旧答案；需要用户Agent主动监听并回复，程序不会自动唤醒Agent。

播放按钮自动隐藏，必须验证currentTime推进，不能把click成功视为播放成功。多选按整个选中集合校验，站点onChecked/active可能比隐藏input可靠。选项刷新会换序，作业按全文内容匹配。

作业页面isAllNative读取未定义window.prototype可能白屏，限定作业初始化Function.prototype后刷新。题干在closed shadow DOM时用CDP DOM.getDocument(pierce:true)读取正常内容。末题是保存按钮；提交确认异步出现。列表重复渲染时选标题首项并限制最近li。低置信度缓存重启仍需核验。

人机验证仅等待本人完成，连续两次消失后继续，不刷新规避。未知样式和提交瞬间验证仍可能漏检；隔离测试不能代替所有真实页面验证。模型自报置信度不能保证正确率。

启动器整理为轻量PowerShell入口与launcher.cjs，统一处理连接、独立浏览器和后台启动，减少平台脚本重复。批处理使用相对路径，Git按CRLF保存Windows入口。

发布检查：JavaScript与PowerShell语法通过，控制台SmokeTest通过；npm test通过弹题、隐藏播放控件/停滞、人机验证等待、兼容API的JSON与错误处理、Agent文件请求ID匹配检查。模型适配测试使用模拟数据，不消耗付费模型额度。暂存文件敏感模式检查未发现个人课程ID或密钥；个人配置和运行目录在gitignore中排除。真实国内服务商及不同课程页面仍需用户Agent验证。
