# 技术日志

## 2026-09-30：课程链接为空导致启动退出

切换课程后本地courseUrl为空，旧启动器在打开Edge前退出，控制台没有清楚显示具体错误。修复为courseName必填，courseUrl可选；新增course-page.cjs按已支持的视频URL及配置课程名称发现目标，允许同一recruitAndCourseId在两种课程路由间跳转，排除登录页与其他课程。配置链接存在时独立Edge直接打开该入口。状态明确显示等待登录/目标课程，失败时显示实际启动日志，进程退出后WaitForExit确保取得退出信息。

新增发现目标页面的隔离测试，空链接、错误课程、路由变化、登录排除均通过；npm test全部通过，实际启动器已运行并显示等待本人登录。尚未登录时不能声称播放已验证。课程目录为空会明确停止，避免误报零节视频已完成。

## 2026-09-30：最可能答案与跨课程成绩格式

用户要求低置信度继续，新增lowConfidenceAction，默认best-effort：按模型已有的最可能答案继续，保留原confidence并记录不确定题号。stop选项保留给需要人工复核的用户；缓存与新答案均应用同一策略。置信度字段无效、题目缺失、答案无法匹配等异常仍停止，不伪造确定性。

课程由courseName/courseUrl配置，提示不限学科。真实跨课程页面结果从“你本次获得的成绩是”变为“本章测试你的得分为”，新增homework/result.cjs统一识别，启动时可恢复已提交结果避免重复提交。tests/results.cjs验证两种格式、小数及未提交页不会误读总分。实际已验证低置信度缓存继续、提交新格式成绩并切到后续单元；成绩保存在私人runtime，不公开。当前仅适配选择/判断单元作业及已支持的视频DOM。

满分页面另使用“恭喜你本章测试取得满分”，通过当前页面总分字段读取满分，不能默认所有作业100分。成绩弹层消失时，可从已提交列表中该单元的“作业成绩”恢复，避免把已提交的答题页误当成下一单元。新增解析测试通过；实际恢复已提交满分单元后继续下一份。

## 2026-09-30：隐藏验证码误判与控制台命名

站点预加载验证码iframe，父容器opacity为0，top为-1000000px。旧检测把有尺寸的隐藏iframe误判为真实验证，导致无限等待。改为检查祖先display/visibility/opacity和视口交集，进入子frame前逐层确认frameElement可见。实际作业列表修复后verificationVisible=false，能正常进入单元分析。隔离测试新增屏幕外透明iframe及其子frame、透明父容器不误判，原真实可见验证/人工消除/停止测试保留，npm test全通过。

作业启动先核验.course_name，配置不符明确报告页面课程和配置课程，避免停在验证或等待标题而无说明。启动失败显示实际日志，成功清除旧错误。视频状态提示在document.body尚未加载时跳过，修复appendChild空引用。课程观看使用同一验证检测，已有播放控件回退及时间推进/停滞测试通过；尚不能保证所有站点页面没有未知问题。

控制台按钮改为“启动课程观看”和“停止课程观看”，SmokeTest增加按钮文字核验。课程切换时个人旧记录归档，未公开个人配置或成绩。

## 2026-09-30 公开版整理

复用Playwright 1.63.0、Windows WinForms、Edge CDP及Codex CLI，没有新增扩展或网页服务。参考 https://github.com/microsoft/playwright 、https://github.com/openai/codex 、https://learn.microsoft.com/en-us/microsoft-edge/devtools/protocol/ 。原有个人技术日志与说明保留在忽略的archive目录。课程ID、运行数据、成绩、登录资料不公开。

新增AGENT_GUIDE.md，要求Agent向用户展示控制台，按账号配置模型。config.cjs、read-config.ps1、config.example.json和model.cjs集中管理课程、CDP与模型。支持国内Agent文件交接、兼容OpenAI Chat Completions的JSON模式和可选已登录Codex CLI，CLI不再硬编码个人安装版本，API密钥仅读取环境变量。文件模式按唯一requestId接收结果，拒绝旧答案；需要用户Agent主动监听并回复，程序不会自动唤醒Agent。

播放按钮自动隐藏，必须验证currentTime推进，不能把click成功视为播放成功。多选按整个选中集合校验，站点onChecked/active可能比隐藏input可靠。选项刷新会换序，作业按全文内容匹配。

作业页面isAllNative读取未定义window.prototype可能白屏，限定作业初始化Function.prototype后刷新。题干在closed shadow DOM时用CDP DOM.getDocument(pierce:true)读取正常内容。末题是保存按钮；提交确认异步出现。列表重复渲染时选标题首项并限制最近li。低置信度缓存重启仍需核验。

人机验证仅等待本人完成，连续两次消失后继续，不刷新规避。未知样式和提交瞬间验证仍可能漏检；隔离测试不能代替所有真实页面验证。模型自报置信度不能保证正确率。

启动器整理为轻量PowerShell入口与launcher.cjs，统一处理连接、独立浏览器和后台启动，减少平台脚本重复。批处理使用相对路径，Git按CRLF保存Windows入口。

发布检查：JavaScript与PowerShell语法通过，控制台SmokeTest通过；npm test通过弹题、隐藏播放控件/停滞、人机验证等待、兼容API的JSON与错误处理、Agent文件请求ID匹配检查。模型适配测试使用模拟数据，不消耗付费模型额度。暂存文件敏感模式检查未发现个人课程ID或密钥；个人配置和运行目录在gitignore中排除。真实国内服务商及不同课程页面仍需用户Agent验证。

## 2026-09-30 新版课程入口、原生倍速与随堂题适配

复用项目已有Playwright与Edge CDP，不新增扩展。现场发现新版入口为wisdom-mooc.zhihuishu.com/study/index；course-page.cjs允许同一课程参数在三个已支持域名路由间变化，launcher在已连接浏览器但目标页缺失时打开配置入口。catalogue.cjs集中适配经典li.video、child-info.hasvideo和chapter-item/子视频目录，展开折叠章节，排除分组与隐藏数字人视频。完成标记读取网站100%或finish-icon，不能把媒体结束直接当作课程完成。

仅修改video.playbackRate会让网站仍显示X1.0；对倍速控件执行DOM click又会被新版页面拒绝并跳回首页。改为正常鼠标悬停与点击原生倍速选项，核验active后设置静音，确认currentTime持续推进。结束后缺完成标记，每个标题最多普通刷新一次并正常补播，不改播放进度或学习数据；刷新前仍检测人机验证并等待本人。

随堂题支持ai-test-question-wrapper以及ai-class-exercise-dialog，识别提交作答/提交和已提交反馈，先核验答案选中，再提交并关闭；隐藏与未知弹窗仍保留页面明确报错。现场已观察网站完成图标、X1.5、静音、时间推进，以及已提交弹窗关闭后续播。新增三种目录、子视频排除、finish-icon、真实鼠标倍速事件及两种新版弹题的隔离测试。完整npm test和控制台SmokeTest通过；公开日志不包含实际课程ID或个人成绩。自动切到下一节另需现场观察，不能仅用隔离测试声称成功。

后续现场核验：上一节网站显示finish-icon后播至结尾，后台产生next-video事件并进入下一节；新视频时间已推进到29秒，paused=false、rate=1.5、muted=true、volume=0。自动切换与新视频播放已实际验证，后台继续运行。真实题干和课程记录仅保留私人runtime。

## 2026-09-30 播放提示误判停止
后台停止原因实际为ai-notice-dialog的videoConfigTip01/好的，而截图为停止后出现的正常随堂题。新增严格匹配这一已知播放器提示并以正常鼠标点击好的；其他未知提示继续明确报告。检测增加祖先display/visibility/opacity核验，避免隐藏提示被当作可见弹窗。隔离测试覆盖已知提示、未知提示拒绝及透明父容器。复用现有Playwright与detector，不增加依赖。题目测试及JavaScript语法通过，后台已重启，实际答题续播需核验。

现场恢复核验：模型返回有效答案，网站已提交随堂题、弹窗关闭，后台产生resumed事件并继续1.5倍静音播放。当前已消失的播放器提示无法现场重现，自动关闭该提示的分支由隔离测试验证。

## 2026-09-30 原生Computer Use接管能力核查
用户指定Codex Agent本身的Computer Use，非CLI截图JSON/Playwright替代方案。本轮未修改运行逻辑。官方https://developers.openai.com/codex/computer-use.md说明：支持地区的Windows/macOS桌面可安装启用Computer Use插件，Windows仅主动桌面前台，设备需解锁并联网；目标应用需经用户授权。当前对话未提供原生Computer Use工具，不能宣称已启用或可接管鼠标。官方页面推荐复杂视觉任务使用GPT-6 Astra，但未明确列出GPT-6 Luna支持，保留不确定性。现有后台程序不能仅靠更换模型名调用桌面工具，异常自动唤醒与模型工具可用性尚未验证。

## 2026-09-30 提交后弹窗重渲染导致关闭超时
运行日志证明模型已回答且网站确认提交，但关闭按钮在前端重渲染时被替换，旧定位器悬等8秒后将任务停为需要关注。新增close-question.cjs，按题目fingerprint重读状态，弹窗已消失或新题出现则返回主循环；同题最多重试3次，停止信号和verification检查生效时不再点击。隔离测试已覆盖点击中弹窗被移除、一次临时失败后恢复、三次失败安全停止、新题变化和停止保护。后台已启动，当前导言视频时间推进中、1.5倍速且静音。

## 2026-10-01 控制台轮询锁住watcher状态文件
运行日志显示课程正常播放、答题提交并恢复后，Node watcher在更新runtime/status.json时收到Windows EBUSY，随即退出；控制台使用File.ReadAllText默认FileShare.Read，与写入冲突，导致错误状态也无法落盘。新增WriteStatus对EBUSY/EPERM/EACCES以100ms间隔有限重试25次；WinForms通过Read-SharedJson以FileShare.ReadWrite与FileShare.Delete共享读取，覆盖视频与作业状态。精确重启旧控制台实例与watcher后，页面继续运行，已观察到播放状态更新和后续弹题请求，rate=1.5、muted=true。未做整套测试以减少额度。

## 2026-10-01 单弹窗含两道随堂题导致误报
实际弹题对话框包含两道多选题并共用提交按钮，识别器此前仅接收单题，误归入未知弹窗而停止。已扩展为最多识别6道单选/多选/判断题，一次模型结构化请求给出各题答案；按卡片隔离点击并逐题核验，随后统一提交，再按fingerprint管理关闭重试。未知题数/结构不提交。页面现场已提交两道题、关闭弹窗并恢复播放，当前课程时间持续推进，1.5倍速静音。代码语法检查通过；按低额度要求未跑全套测试。

## 2026-10-01 播放器提示被同时出现的题目遮挡

上一轮新增多题弹窗支持后，发现已知videoConfigTip01可与AI随堂题同时显示。inspect对两个组件均报告可见，但顶层随堂题覆盖提示，程序先点击被遮挡的按钮导致8秒超时。修复主循环优先处理可见题目，题目提交关闭后再处理播放器提示，保持验证等待与未知弹窗策略不变。现场重启后已观察答题提交、关闭和视频resumed事件，time持续推进、1.5倍速且静音。JavaScript语法检查通过；未运行全套测试以节省额度。

## 2026-10-01 提示点击期间新弹题出现

仅优先处理已识别题目仍有窗口期：状态检查后、点击播放器提示前，新的题目可出现并遮住提示。提示点击超时后现重新检查页面，题目已出现或提示已消失则回主循环；同一提示仍在最多重试三次。当前暂停曾因模型请求约17秒，已观察提交、关闭及resumed。后台按STOP重启加载修复，语法检查通过。

## 2026-10-01 模型超时后有限重试

实际停止原因为Codex CLI答题请求超过90秒，没有返回。新增仅对请求超时的一次重试：先检查人机验证、STOP及弹窗fingerprint，确认仍为同题后请求；第二次使用独立结果目录，避免超时进程迟到结果混入。连续超时或其他错误仍报告，未获取有效答案前不提交。后台已重启，代码语法检查通过。

## 2026-10-01 启动跟随当前课程

原因是launcher按本地旧courseUrl找页并另开窗口，watcher也按旧配置寻找课程。复用现有Playwright与Windows窗口API：启动时按可接管Edge实际窗口标题和位置匹配当前标签，锁定选中URL传给worker；不能确定时明确报告，不猜测。网页焦点/可见性在本机两个标签均报告为真，不能作为唯一依据。edge-window-order.ps1为新增窗口读取辅助；README与Agent说明同步维护。启动时暂停其他课程媒体，避免网站同时播放提示。经典播放器用speedBox当前标签确认X1.5，兼容新版active标记。已现场选中古诗词过故人庄上；course-page和playback隔离检查通过。答题一度被同时播放提示遮挡，已暂停旧课程、正常确认提示并重启，续播另核验。私人配置和课程URL不提交。

现场续播核验：古诗词当前视频time已推进至383秒，paused=false、rate=1.5、muted=true，已出现question-closed与resumed事件。

## 2026-10-01 同时播放提示阻塞

截图与runtime证明自动切换视频后出现经典dialog-tips的“同时播放多个视频，其他页面的学习进度将停止记录哦！”；原检测仅支持新版videoConfigTip01，归入未知弹窗而停止。复用detector新增严格文案与“我知道了”按钮识别，主循环优先暂停其他可接管课程媒体，再正常点击确认，返回循环继续；未知提示仍报告。新增已知提示与未知提示拒绝隔离检查，questions检查及语法通过。重启后现场古诗词视频paused=false、rate=1.5、muted=true；只有一个watcher进程。独立于CDP连接的其他浏览器播放无法控制，可能再次引发提示。
