// ==UserScript==
// @name         Keylol-Autorate
// @namespace    Keylol
// @include      https://keylol.com/forum.php
// @include      https://keylol.com/
// @require      https://code.jquery.com/jquery-3.5.1.min.js#sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=
// @version      1.2.3-DreamNya
// @icon         https://raw.githubusercontent.com/DreamNya/Keylol-Autorate/DreamNya-patch-1/img/konoha.png
// @downloadURL	 https://github.com/DreamNya/Keylol-Autorate/raw/DreamNya-patch-1/keylol-autorate.user.js
// @updateURL	 https://github.com/DreamNya/Keylol-Autorate/raw/DreamNya-patch-1/keylol-autorate.user.js
// @description  Keylol forum autorate tool
// @author       DreamNya
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==
const update_logs=
`10.version 1.2.3-DreamNya(2020-12-08)
a.修复启用精确冷却倒计时时开启多页面造成的毫秒级重复加体冲突
b.现已加入随机标识符辨别脚本运行次数
c.优化检测剩余体力速度
d.优化面板按钮代码
e.增加及取消注释某些debug，降低作者答疑难度

9.version 1.2.2-DreamNya(2020-12-01)
a.体力冷却异常增加防御措施，现在不会无限提示无体力了
b.main()函数增加try catch防御措施，以防万一,但运行速度变慢，自行选择
c.现在每加完一个回复的体力就更新一次收藏说明，而不是以前的加完全部回复才更新，防止异常漏更新
d.现在体力记录、调试信息可以动态更新了
e.进一步模块化设置面板div文本代码
f.增加可能有点鸡肋的记录面板位置功能
（本来想用函数算最佳位置，后来想了想还是自定义吧）

8.version 1.2.1-DreamNya(2020-11-23)
a.优化Autorate显示方法，如超过10秒未成功初始化，会弹出提示建议刷新页面
b.优化代码写法
c.优化导出调试信息，现在可以导出完整调试信息
d.优化导出体力记录/链接
e.优化css代码，添加@grant GM_addStyle，增加可读性，看上去没有以前那么杂乱了

7.version 1.2.0-DreamNya(2020-11-22)
a.重大更新，增加可视化脚本操作面板
b.原自定义常量设置直接加入设置面板，无需打开油猴即可设置
c.增加体力导出功能，现可查看历史加体力信息，并自动转到目标帖
d.增加导出脚本调试信息功能，方便debug，提交异常信息
f.增加脚本强制复位功能（与连续3次手动执行脚本共存）

6.version 1.1.3-DreamNya (2020-11-12)
a.修复对比pid记录bug
b.优化获取时间函数

5.version 1.1.2-DreamNya（2020-11-05）
a.修复手动Autorate后的倒计时bug
b.修复对比pid记录bug

4.version 1.1.1-DreamNya（2020-10-25）
a.增加检测脚本重复运行机制，防止多页面重复运行脚本导致加体力冲突
（如脚本异常退出，要使脚本正常运行需连续点击3次按钮，或手动修改脚本存储内容"Status": "On"为"Status": "Off",）

3.version 1.1.0-DreamNya（2020-10-20）
a.修复毫秒显示bug
b.重写RateRecord，现pid tid已根据uid分类
c.增加定时刷新页面功能

2.version 1.0.9-DreamNya（2020-09-16）
a.修复冷却完毕时的计时器bug
b.新增加体力延迟、精确冷却倒计时功能
c.重写main()中获取帖子加体力的逻辑(未测试同时加多个收藏贴的功能 不推荐同时加多个收藏贴 可能存在bug)
d.存储已加体力tid pid信息，进一步优化加体力速度
e.存储运行日志，方便debug以及记录体力操作信息

1.version 1.0.8-DreamNya（2020-08-26）
a.在原作者ohperhaps 1.0.7版本基础上新增登陆论坛无需点击Autorate按钮自动加体力功能（首次使用需要手动点击按钮）
b.增加Autorate按钮显示体力冷却倒计时功能（hh:mm:ss格式）。默认开启，每隔1000毫秒刷新一次
  脚本编辑页面开头可自定义刷新时间const Autotime = 1000;（修改默认1000的为目标时间，单位毫秒，0为关闭显示）
c.修改脚本只有在论坛主页才会生效，以加快论坛加载速度

已知问题：
a.同时多个收藏贴只会平均体力，快加完其中一个时，不会优先加完。可能是1.0.9版本重写main()时存在逻辑问题。(无打算处理，不推荐同时加多个体力)

计划中：
a.增加存储debug信息开关。目前需要手动删除debug注释(暂无计划更新)
b.uid体力加完后一段时间自动清理(暂无计划更新)
c.每次增加体力前获取一次体力信息(因功能取舍/逻辑问题更新推迟)
`
const version="1.2.3-DreamNya"

let Autotime = GM_getValue('Autotime',1000); //自定义体力冷却倒计时刷新周期，单位毫秒，0为关闭显示。
let HideAutoRate = GM_getValue('HideAutoRate',false); //显示体力冷却时是否隐藏Autorate文字 true:hh:mm:ss / false:Autorate hh:mm:ss
let delay = GM_getValue('delay',5000); //自定义24小时体力冷却完毕后再次加体力时延迟
let PreciseCooldown = GM_getValue('PreciseCooldown',true); //精确体力冷却倒计时 false:只在初始化时获取一次冷却时间 true:每个刷新周期获取一次冷却时间
let refresh = GM_getValue('refresh',600000); //定时刷新页面，单位毫秒，0为不刷新
let position = GM_getValue('position', false); //设置刷新页面后面板位置 0:固定面板位置 1:点击关闭按钮时记录面板位置 -1：恢复默认位置(不影响是否固定)
let debug_main = GM_getValue('debug_main',false); //是否开始debug加体力模式 false:正常运行速度，如遇bug需自行查看控制台 true:运行速度变慢，但较稳定，适合新手
//const debug = 3; //0:不存储除体力冷却体力操作以外的任何信息 1:存储有限debug信息 2:存储大量debug信息 3:1+2
//提示：原自定义常量设置现已加入设置面板，如需手动修改可至脚本存储处`


(function() {
    'use strict';
    const $ = unsafeWindow.jQuery
    const homePage = "https://keylol.com/"
    const selfUid = $("li.dropdown").find("a").attr("href").split("-")[1]
    const formHash = $("[name=formhash]").val()
    let auto_refresh=0 //记录脚本运行时间
    let init = GM_getValue('Ratetime')
    let init_time=new Date().getTime()
    let uuid=random_uuid() //脚本运行标识符

    if (init){ //初始化倒计时
        var Cooldown=init+86400000+delay-init_time //获取体力冷却时间
        var Timer = null
        AutoTimer()
        //debugpid()
    }

    if ($('#nav-user-action-bar').length>0){ //初始化Autorate按钮
        views()
    }else{
        var views_times=0
        var views_Timer =setInterval(views_onload,1000)
        }

    function random_uuid(){ //随机标识符
        let random_string="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
        let result=""
        for (let i=0;i<5;++i){
            result += random_string.charAt(Math.floor(Math.random() * random_string.length))
        }
        return result
    }

    function xhrAsync (url, method="GET", data="") {
        if (method === "GET") {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    "method": "GET",
                    "url": homePage + url,
                    "onload": resolve
                })
            })
        } else if (method === "POST") {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    "method": "POST",
                    "url": homePage + url,
                    "data": data,
                    "onload": resolve
                })
            })
        }
    }
    function compare(property){
        return function(a,b){
            let value1 = a[property];
            let value2 = b[property];
            return value1 - value2;
        }
    }
    async function getUserScore() {
        let ts_ = (new Date()).getTime()
        let score_ = await xhrAsync(
            `forum.php?mod=misc&action=rate&tid=7800&pid=106186&infloat=yes&handlekey=rate&t=${ts_}&inajax=1&ajaxtarget=fwin_content_rate` //选用了一个没人加过体的古老帖子检测剩余体力，加快检测速度
                                   ).then((res) => { return $("table.dt.mbm td:last", res.response).text() })
        if (/^\d+$/.test(score_)) { return parseInt(score_) }
        else{
            let threads = await xhrAsync(`forum.php?mod=guide&view=newthread`).then((res) => {
                let threads = []
                $("div.bm_c", res.response).find("tbody").each(function () { threads.push($(this).attr("id").split("_").pop()) })
                return threads })
            for (let thread of threads) {
                let posts = await xhrAsync(`t${thread}-1-1`).then((res) => {
                    let posts = []
                    $("#postlist > div[id^=post_]", res.response).each(function () { posts.push($(this).attr("id").split("_").pop()) })
                    return posts
                })
                for (let post of posts) {
                    let ts = (new Date()).getTime()
                    let score = await xhrAsync(`forum.php?mod=misc&action=rate&tid=${thread}&pid=${post}&infloat=yes&handlekey=rate&t=${ts}&inajax=1&ajaxtarget=fwin_content_rate`).then((res) => {
                        return $("table.dt.mbm td:last", res.response).text()
                    })
                    if (/^\d+$/.test(score)) { return parseInt(score) }
                }
            }
        }
    }
    function getUserCredit(uid) {
        let creditBox = {
            "30": { step: 0},
            "31": { step: 0},
            "32": { step: 1},
            "33": { step: 2},
            "34": { step: 2},
            "35": { step: 3},
            "36": { step: 3},
            "37": { step: 4},
            "51": { step: 5},
            "52": { step: 0},
        }
        return Promise.all([xhrAsync(`suid-${uid}`), getUserScore()]).then((results) => {
            let gid = $("li:contains('用户组')", results[0].response).find("a").attr("href").split("=").pop()
            let credits = creditBox[gid] || { step: 4 }
            credits.total = results[1]
            return credits
        })
    }
    async function getCollections() {
        let collections = []
        for(let page = 1; page <= 40; page++) {
            let res = await xhrAsync(`plugin.php?id=keylol_favorite_notification:favorite_enhance&formhash=${formHash}&size=100&page=${page}`)
            let cs = $("#delform", res.response).find("tr")
            if (cs.length === 0) { break }
            else {
                cs.each(function () {
                    let quote = formatQuote($("span.favorite_quote.xi1", this).text())
                    if (quote) {
                        collections.push({favid: $(this).attr("id").split("_").pop(),
                                          uid: $("[href^='suid']", this).attr("href").split("-").pop(),
                                          username: $("[href^='suid']", this).text(),
                                          quote: quote[0],
                                          remain: quote[1],
                                          score: 0})
                    }
                })
            }
        }
        return collections.sort(compare('remain'))
    }
    function calcScores() {
        return Promise.all([getCollections(), getUserCredit(selfUid)]).then((results) => {
            let total = results[1].total
            let calcFlag = results[0].length > 0
            while(calcFlag) {
                for(let item of results[0]) {
                    if (total < 1) { calcFlag = false; break }
                    else {
                        if (item.score < item.remain) { item.score++; total-- }
                    }
                }
                if (results[0].every(item => item.score === item.remain)) { calcFlag = false }
            }
            results[0].forEach(function (item) {item.step = results[1].step})
            return [results[0], results[1].total]
        })
    }
    function getUserReplys(uid, page=1) {
        return xhrAsync(`home.php?mod=space&uid=${uid}&do=thread&view=me&from=space&type=reply&order=dateline&page=${page}`).then((res) => {
            let replys = []
            $("#delform", res.response).find("td.xg1").each(function () {
                let urlParams = new URLSearchParams($(this).find("a").attr("href"))
                replys.push({tid: urlParams.get("ptid"),
                             pid: urlParams.get("pid")})
            })
            return replys
        })

    }
    function formatQuote(quote, addend=0) {
        let quote_num = quote.match(/\d+/g)
        if (/^\d+\/\d+$/.test(quote) && parseInt(quote_num[0]) < parseInt(quote_num[1])) {
            return [(parseInt(quote_num[0]) + parseInt(addend)).toString() + '/' + quote_num[1].toString(), (parseInt(quote_num[1]) - parseInt(quote_num[0]) - parseInt(addend))]
        }
    }
    function updateQuote(favid, quote) {
        const formData = new FormData()
        formData.append("favid", favid)
        formData.append("quote", quote)
        return xhrAsync(`plugin.php?id=keylol_favorite_notification:favorite_enhance&formhash=${formHash}`, "POST", formData).then((res) => {
            GM_setValue(getDate()+' updateQuote',res.responseText)
            return res.responseText
        })
    }
    function rate(tid, pid, score, reason) {
        const formData = new FormData()
        formData.append("formhash", formHash)
        formData.append("tid", tid)
        formData.append("pid", pid)
        formData.append("referer", `${homePage}forum.php?mod=viewthread&tid=${tid}&page=0#pid${pid}`)
        formData.append("handlekey", "rate")
        formData.append("score1", score)
        formData.append("reason", reason)
        return xhrAsync(`forum.php?mod=misc&action=rate&ratesubmit=yes&infloat=yes&inajax=1`, "POST", formData).then((res) => {
            if (res.responseText.indexOf('succeedhandle_rate') !== -1) {
                return ('successful')
            } else if (res.responseText.indexOf('errorhandle_rate') && res.responseText.indexOf('24 小时评分数超过限制') !== -1) {
                return ('exceeded')
            } else if (res.responseText.indexOf('errorhandle_rate') && res.responseText.indexOf('您不能对同一个帖子重复评分') !== -1) {
                return ('failed')
            } else {
                return ('Unknown')
            }
        })
    }

    function main(Auto=false){
        if (Auto){
            GM_setValue(getDate()+' main','自动执行脚本')
            if(debug_main){main_debug()}else{main_normal()}
        }else{
            let status = GM_getValue('Status',"Off") //检测加体力状态 防止重复运行
            if (status == "Off"){
                GM_setValue('Status',uuid)
                GM_setValue(getDate()+' main','手动执行脚本')
                if(debug_main){main_debug()}else{main_normal()}
            }else{
                GM_setValue(getDate()+' Error','手动加体力 检测到脚本重复运行')
                alert("Error\n手动加体力 检测到脚本重复运行\n如脚本异常退出请手动强制复位")
            }
        }
    }

    async function main_debug() {
        let message = []
        let itemScores = await calcScores()
        let page =1
        let RateRecord=GM_getValue('RateRecord',[]) //读取tid pid记录
        let i=0 //根据uid获取RateRecord存储序号
        let mark=false //正常运行标记
        let status = GM_getValue('Status') //检测加体力状态 防止重复运行
        GM_setValue(getDate(),"debug main")
        try{
            if (status == uuid){
                GM_setValue('Status',"On") //防止重复运行标记
                GM_setValue(getDate()+' itemScores',itemScores)
                if (itemScores[0].length === 0) {
                    message.push('未找到正确格式的收藏帖子！\n')
                    GM_setValue(getDate()+' result','未找到正确格式的收藏帖子！')
                }
                while (itemScores[0].length >0){
                    if (itemScores[1] === 0) {
                        if (Cooldown < 0){
                            Cooldown=undefined
                            GM_deleteValue('Ratetime')
                            GM_setValue(getDate()+' Error','脚本冷却异常，当前无剩余体力！')
                            message.push('Error\n脚本冷却异常，当前无剩余体力！\n冷却时间已清除，待体力冷却完毕后，请手动运行脚本初始冷却时间。')
                        } else {
                            GM_setValue(getDate()+' result','当前无剩余体力！请稍后再尝试！')
                            message.push('当前无剩余体力！请稍后再尝试！\n')
                        }
                        break
                    }else{
                        mark=true
                        body:
                        while(page<51){
                            let replys = await getUserReplys(itemScores[0][0].uid, page)
                            hand:
                            while (replys.length > 0 ){
                                //GM_setValue(getDate()+' itemScores[0][0].uid, page, replys',[itemScores[0][0].uid, page, replys])
                                if (itemScores[0][0].score > 0) { //剩余体力
                                    let attend = Math.min(itemScores[0][0].step, itemScores[0][0].score) //每次加体力数
                                    let new_quote = formatQuote(itemScores[0][0].quote, attend)[0] //体力说明计数
                                    let tid=[]
                                    let pid=[]
                                    if (RateRecord.length>0){
                                        i=getRateRecord(RateRecord,itemScores[0][0].uid) //读取uid记录
                                        if (i > -1){
                                            tid=RateRecord[i].tid //读取tid记录
                                            pid=RateRecord[i].pid //读取pid记录
                                        } else{
                                            RateRecord.push({uid:itemScores[0][0].uid,
                                                             tid:tid,
                                                             pid:pid})
                                            i=RateRecord.length-1
                                        }
                                        for (let Record of pid){ //对比pid记录 存在则直接跳过 减少POST
                                            if (replys[0].pid == Record){
                                                replys.shift()
                                                //GM_setValue(getDate()+' replys,replys.length',[replys,replys.length])
                                                if (!replys.length>0){
                                                    break hand
                                                }
                                            }
                                        }
                                    }else{
                                        RateRecord=[{uid:itemScores[0][0].uid,
                                                     tid:tid,
                                                     pid:pid}]
                                        i=0
                                    }
                                    if (GM_getValue('Status') != uuid){ //最后一道检测重复运行防线
                                        GM_setValue(getDate()+' Error','uuid不匹配2 检测到脚本重复运行')
                                        mark=false
                                        message.push('Error\nuuid不匹配2 检测到脚本重复运行\n如脚本异常退出请手动强制复位\n')
                                        break body
                                    }
                                    let rate_result = await rate(replys[0].tid, replys[0].pid, attend, new_quote)
                                    /*GM_setValue(getDate()+" rate_log",{replys_tid: replys[0].tid,
                                                          replys_pid: replys[0].pid,
                                                          attend: attend,
                                                          new_quote: new_quote,
                                                          rate_result: rate_result})*/
                                    if (rate_result === 'successful') {
                                        itemScores[0][0].score -= attend
                                        itemScores[0][0].quote = new_quote
                                        //GM_setValue(getDate()+" successful itemScores[0][0].score",itemScores[0][0].score)
                                        //GM_setValue(getDate()+" successful itemScores[0][0].quote",itemScores[0][0].quote)
                                        GM_setValue('Ratetime', new Date().getTime()) //记录加体力时间
                                        Cooldown = 86400000+delay
                                        GM_setValue(getDate()+" rate",`user: ${itemScores[0][0].username} tid: ${replys[0].tid} pid: ${replys[0].pid} score: ${attend} reason:${new_quote}`) //记录加体力结果
                                        message.push(`user: ${itemScores[0][0].username} tid: ${replys[0].tid} pid: ${replys[0].pid} score: ${attend} reason:${new_quote}\n`)
                                        updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                                    } else if (rate_result === 'exceeded') {
                                        updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                                        GM_setValue(getDate()+' result','当前体力已全部加完!')
                                        message.push('当前体力已全部加完!\n')
                                        break body
                                    } else if(rate_result === 'Unknown'){
                                        let log=`replys_tid: ${replys[0].tid},replys_pid: ${replys[0].pid},attend: ${attend},new_quote: ${new_quote},rate_result: ${rate_result}`
                                    GM_setValue(getDate()+" rate_log",log)
                                        message.push(`存在异常帖:${log}\n`)
                                        console.log(log)
                                    }
                                    RateRecord[i].tid.unshift(replys[0].tid) //记录本次tid
                                    RateRecord[i].pid.unshift(replys[0].pid) //记录本次pid
                                }else {
                                    //updateQuote(itemScores[0][0].favid, itemScores[0][0].quote) //*可能存在page=50 score>0不更新的bug
                                    break body
                                }
                                replys.shift() //加下一个体力
                            }
                            ++page
                        }
                    }
                    itemScores[0].shift() //加下一个收藏贴体力 *未测试存在多个收藏贴的情况 可能存在bug；如有bug可以手动多次运行
                }
                if(mark){GM_setValue('RateRecord',RateRecord)}
                GM_setValue('Status',"Off")
                alert(message.join(''))
                if(Cooldown>0 && Timer == null && Autotime>0){Timer = setInterval(AutoTimer,Autotime)} //重启倒计时冷却
            }else{
                clearInterval(Timer)
                Timer = null
                GM_setValue(getDate()+' Error','uuid不匹配 检测到脚本重复运行')
                alert("Error\nuuid不匹配 检测到脚本重复运行\n如脚本异常退出请手动强制复位\n")
            }
        }
        catch(error){
            GM_deleteValue('Ratetime')
            GM_setValue(getDate()+' ERROR',error.name+" : "+error.message)
            alert("ERROR\n遇到重大错误，请勿再次执行脚本,\n请将以下内容反馈给作者\n"+error)
        }
    }

    async function main_normal() {
        let message = []
        let itemScores = await calcScores()
        let page =1
        let RateRecord=GM_getValue('RateRecord',[]) //读取tid pid记录
        let i=0 //根据uid获取RateRecord存储序号
        let mark=false //正常运行标记
        let status = GM_getValue('Status',"Off") //检测加体力状态 防止重复运行
        GM_setValue(getDate(),"normal main")
        if (status == uuid){
            GM_setValue(getDate()+' itemScores',itemScores)
            if (itemScores[0].length === 0) {
                message.push('未找到正确格式的收藏帖子！\n')
                GM_setValue(getDate()+' result','未找到正确格式的收藏帖子！')
            }
            while (itemScores[0].length >0){
                if (itemScores[1] === 0) {
                    if (Cooldown < 0){
                        Cooldown=undefined
                        GM_deleteValue('Ratetime')
                        GM_setValue(getDate()+' Error','脚本冷却异常，当前无剩余体力！')
                        message.push('Error\n脚本冷却异常，当前无剩余体力！\n冷却时间已清除，待体力冷却完毕后，请手动运行脚本初始冷却时间。')
                    } else {
                        GM_setValue(getDate()+' result','当前无剩余体力！请稍后再尝试！')
                        message.push('当前无剩余体力！请稍后再尝试！\n')
                    }
                    break
                }else{
                    mark=true
                    body:
                    while(page<51){
                        let replys = await getUserReplys(itemScores[0][0].uid, page)
                        hand:
                        while (replys.length > 0 ){
                            //GM_setValue(getDate()+' itemScores[0][0].uid, page, replys',[itemScores[0][0].uid, page, replys])
                            if (itemScores[0][0].score > 0) { //剩余体力
                                let attend = Math.min(itemScores[0][0].step, itemScores[0][0].score) //每次加体力数
                                let new_quote = formatQuote(itemScores[0][0].quote, attend)[0] //体力说明计数
                                let tid=[]
                                let pid=[]
                                if (RateRecord.length>0){
                                    i=getRateRecord(RateRecord,itemScores[0][0].uid) //读取uid记录
                                    if (i > -1){
                                        tid=RateRecord[i].tid //读取tid记录
                                        pid=RateRecord[i].pid //读取pid记录
                                    } else{
                                        RateRecord.push({uid:itemScores[0][0].uid,
                                                         tid:tid,
                                                         pid:pid})
                                        i=RateRecord.length-1
                                    }
                                    for (let Record of pid){ //对比pid记录 存在则直接跳过 减少POST
                                        if (replys[0].pid == Record){
                                            replys.shift()
                                            //GM_setValue(getDate()+' replys,replys.length',[replys,replys.length])
                                            if (!replys.length>0){
                                                break hand
                                            }
                                        }
                                    }
                                }else{
                                    RateRecord=[{uid:itemScores[0][0].uid,
                                                 tid:tid,
                                                 pid:pid}]
                                    i=0
                                }
                                if (GM_getValue('Status') != uuid){ //最后一道检测重复运行防线
                                    GM_setValue(getDate()+' Error','uuid不匹配2 检测到脚本重复运行')
                                    mark=false
                                    message.push('Error\nuuid不匹配2 检测到脚本重复运行\n如脚本异常退出请手动强制复位\n')
                                    break body
                                }
                                let rate_result = await rate(replys[0].tid, replys[0].pid, attend, new_quote)
                                /*GM_setValue(getDate()+" rate_log",{replys_tid: replys[0].tid,
                                                          replys_pid: replys[0].pid,
                                                          attend: attend,
                                                          new_quote: new_quote,
                                                          rate_result: rate_result})*/
                                if (rate_result === 'successful') {
                                    itemScores[0][0].score -= attend
                                    itemScores[0][0].quote = new_quote
                                    //GM_setValue(getDate()+" successful itemScores[0][0].score",itemScores[0][0].score)
                                    //GM_setValue(getDate()+" successful itemScores[0][0].quote",itemScores[0][0].quote)
                                    GM_setValue('Ratetime', new Date().getTime()) //记录加体力时间
                                    Cooldown = 86400000+delay
                                    GM_setValue(getDate()+" rate",`user: ${itemScores[0][0].username} tid: ${replys[0].tid} pid: ${replys[0].pid} score: ${attend} reason:${new_quote}`) //记录加体力结果
                                    message.push(`user: ${itemScores[0][0].username} tid: ${replys[0].tid} pid: ${replys[0].pid} score: ${attend} reason:${new_quote}\n`)
                                    //updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                                } else if (rate_result === 'exceeded') {
                                    updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                                    GM_setValue(getDate()+' result','当前体力已全部加完!')
                                    message.push('当前体力已全部加完!\n')
                                    break body
                                } else if(rate_result === 'Unknown'){
                                    let log=`replys_tid: ${replys[0].tid},replys_pid: ${replys[0].pid},attend: ${attend},new_quote: ${new_quote},rate_result: ${rate_result}`
                                    GM_setValue(getDate()+" rate_log",log)
                                    message.push(`存在异常帖:${log}\n`)
                                    console.log(log)
                                }
                                RateRecord[i].tid.unshift(replys[0].tid) //记录本次tid
                                RateRecord[i].pid.unshift(replys[0].pid) //记录本次pid
                            }else {
                                updateQuote(itemScores[0][0].favid, itemScores[0][0].quote) //*可能存在page=50 score>0不更新的bug
                                break body
                            }
                            replys.shift() //加下一个体力
                        }
                        ++page
                    }
                }
                itemScores[0].shift() //加下一个收藏贴体力 *未测试存在多个收藏贴的情况 可能存在bug；如有bug可以手动多次运行
            }
            if(mark){GM_setValue('RateRecord',RateRecord)}
            GM_setValue('Status',"Off")
            alert(message.join(''))
            if(Cooldown>0 && Timer == null && Autotime>0){Timer = setInterval(AutoTimer,Autotime)} //重启倒计时冷却
        }else{
            clearInterval(Timer)
            Timer = null
            GM_setValue(getDate()+' Error','uuid不匹配 检测到脚本重复运行')
            alert("Error\nuuid不匹配 检测到脚本重复运行\n如脚本异常退出请手动强制复位\n")
        }
    }

    function getDate(){
        return [new Date().getFullYear(),check(new Date().getMonth()+1),check(new Date().getDate())].join('-')+' '+[check(new Date().getHours()),check(new Date().
getMinutes()),check(new Date().getSeconds()),check_mil(new Date().getMilliseconds())].join(':')+' '+uuid
    }
    function getRateRecord(RateRecord,uid){ //读取uid记录
        let i = 0
        for (let Record of RateRecord){
            if (Record.uid == uid) {
                return i
            }
            ++i
        }
        return -1
    }

    function check(val) { //优化显示体力冷却时间
        if (val < 10) {
            return ("0" + val)
        }
        else{
            return (val)
        }
    }

    function check_mil(val) { //优化显示体力冷却时间(毫秒)
        if (val < 10) {
            return ("00" + val)
        }
        else if (val<100){
            return ("0" + val)
        }
        else{
            return (val)
        }
    }
    function AutoTimer() { //自动加体力
        let now_time
        if (PreciseCooldown){
            now_time = new Date().getTime()
            Cooldown = GM_getValue('Ratetime')+86400000+delay-now_time
        }else{
            Cooldown -= Autotime
        }
        let Hour = Math.floor(Cooldown/1000/3600)
        let Minute = Math.floor((Cooldown-Hour*1000*3600)/1000/60)
        let Second = Math.floor((Cooldown-Hour*1000*3600-Minute*1000*60)/1000)
        let time =[check(Hour),check(Minute),check(Second)].join(':')
        if (Cooldown <0) { //判断体力冷却是否结束
            let time_debug =new Date().getTime()
            Cooldown=GM_getValue('Ratetime')+86400000+delay-time_debug //精确冷却时间
            if (Cooldown <1){
                clearInterval(Timer)
                Timer = null
                let status = GM_getValue('Status',"Off") //检测加体力状态 防止重复运行
                if (status == "Off"){
                    GM_setValue('Status',uuid)
                    main(true)
                }else{
                    GM_setValue(getDate()+' Error','自动加体力 检测到脚本重复运行')
                    alert("Error\n自动加体力 检测到脚本重复运行\n如脚本异常退出请手动强制复位")
                }
            }else{
                location.reload()
            }
        }
        else if(Cooldown > 1 && Autotime > 0 ){ //体力冷却中
            if (HideAutoRate == false) { //显示体力冷却时间
                $('#autoRate').html('Autorate<br/>'+time)
            }
            else{
                $('#autoRate').html(time)
            }
            if(Timer == null){
                Timer = setInterval(AutoTimer,Autotime) //设置显示体力冷却时间计时器
            }
        }
        if (PreciseCooldown){
            auto_refresh=now_time-init_time
        }else{
            auto_refresh+=Autotime
        }
        if (auto_refresh > refresh && refresh > 0){location.reload()}
    }

    function views() { //初始化Autorate按钮
        let rateDiv = $('<div/>', {id: 'rateDiv'})
        let rateBtn = $('<a/>', {
            id: 'autoRate',
            html: 'Autorate',
            class: 'btn btn-user-action',
            style: 'margin-right: 10px', //从与搜索框绑定改为与消息提醒头像绑定后右边距自动缩了，原因不明
            mouseover: function () { $(this).css({'background-color': '#57bae8', 'color': '#f7f7f7'}) },
            mouseleave: function () { $(this).css({'background-color': '', 'color': ''}) },
            click: function () { panel() }}) //点击显示可视化操作面板
        rateDiv.append(rateBtn)
        $('#nav-user-action-bar').before(rateDiv) //从与搜索框绑定改为与消息提醒头像绑定 增加稳定性（可能）
    }

    function views_onload(){ //
        if ($('#nav-user-action-bar').length>0){
            views()
            clearInterval(views_Timer)
            views_Timer =null
        } else {
            ++views_times
            if(views_times==10){
                alert("Error\n脚本已运行超过10秒，Autorate按钮初始化失败。\n建议刷新页面。")
            }
        }
    }

    function debugpid() { //清除因旧版本bug导致RateRecord重复记录内容，新版本已修复
        let RateRecord=GM_getValue('RateRecord',[])
        for (let i=0;i<RateRecord.length;i++){
            for (let n=0;n<RateRecord[i].pid.length;n++){
                for (let t=n+1;t<RateRecord[i].pid.length;t++){
                    if (RateRecord[i].pid[n]==RateRecord[i].pid[t]){
                        RateRecord[i].pid.splice(t,1)
                        RateRecord[i].tid.splice(t,1)
                    }
                }
            }
        }
        GM_setValue('RateRecord',RateRecord)
    }

    function panel(){
        if($("#setting").length>0){
            $("#setting").toggle()
        }else{
            GM_addStyle (`
.setting_div_height{height:15px!important;}
.setting_div_left{text-align:left!important;}
.setting_button{width:90px!important;white-space: nowrap!important;}
.setting_div_div{margin-top:4px!important;}
.hide_button{position:absolute!important;top:20px!important;right:20px!important;}
.div_text{line-height:15px; font-size:11px;padding:5px; clear:both; margin-top:5px;margin-left:5px;height:500px;overflow:auto;}
.setting{position:fixed;z-index:201;left:360px;top:120px;}
.update_logs{position:fixed;z-index:201;left:320px;top:40px;}
.log_all{position:fixed;z-index:201;left:450px;top:40px;}
.log_history{position:fixed;z-index:201;left:450px;top:40px;}
.log_history_link{position:fixed;z-index:201;left:450px;top:40px;}
`)
            $("body").append(`
<div id="setting" style="position:fixed;z-index:201;">
<table cellpadding="0" cellspacing="0"><tbody><tr><td class="t_l"></td><td class="t_c" style="cursor:move" onmousedown="dragMenu($('setting'), event, 1)"></td>
<td class="t_r"></td></tr><tr><td class="m_l" style="cursor:move" onmousedown="dragMenu($('setting'), event, 1)"></td>
<td class="m_c" style="width:780px;">
<span><a href="javascript:;" class="flbc" id="setting_hide" >关闭</a></span>
<form id="panel_form">
<div style="line-height:20px; font-size:13px;padding:5px; clear:both; margin-top:5px;margin-left:5px;width:500px">
<b>自动加体力脚本Keylol-Autorate</b>
<div id="version">Version:</div>
增强版作者：<a href="https://keylol.com/suid-138415">DreamNya(steven026)</a> 原作者：<a href="https://keylol.com/suid-816143">ohperhaps</a><br>
Github：<a href="https://github.com/DreamNya/Keylol-Autorate">https://github.com/DreamNya/Keylol-Autorate</a><br>
Keylol：<a href="https://keylol.com/t660000-1-1">https://keylol.com/t660000-1-1</a><br>
</div>
</form></td>
<td class="m_r" style="cursor:move" onmousedown="dragMenu($('setting'), event, 1)"></td></tr>
<tr><td class="b_l"></td><td class="b_c" style="cursor:move" onmousedown="dragMenu($('setting'), event, 1)"></td><td class="b_r"></td>
</tr>
</tbody>
</table>
</div>
`)
            function addform(id,tittle,text){ //添加面板按钮
                $('#panel_form').append(`<div class="o pns"><button type="button" id="${id}">${tittle}</button><div>${text}</div></div>`)
            }

            addform("main" ,"手动执行脚本",`手动执行一次加体力操作 提示：在脚本自动弹出结果对话框前请耐心等待，切勿关闭或刷新页面以免脚本异常运行。`)
            addform("debug_main" , "设置运行模式",`是否开始debug加体力模式 0:正常运行速度，如遇bug需自行查看控制台 1:运行速度变慢，但较稳定，适合新手，默认0。`)
            addform("update_log" , "显示更新日志",`显示脚本更新日志`)
            addform("autotime" , "设置倒计时",`自定义体力冷却倒计时刷新周期，单位毫秒，0为关闭显示，默认1000。`)
            addform("hideautorate" , "初始化失败",`体力冷却倒计时时显示或隐藏Autorate文字 隐藏:hh:mm:ss / 显示:Autorate hh:mm:ss`)
            addform("delay" , "倒计时延迟",`自定义24小时体力冷却完毕后再次加体力时延迟，单位毫秒，最小为0，默认5000。`)
            addform("precise" , "精确倒计时",`精确体力冷却倒计时 0:只在初始化时获取一次冷却时间 1:每个刷新周期获取一次冷却时间，默认1。`)
            addform("logs" , "导出体力文本",`以文本形式导出所有存储在本地的加体力记录。`)
            addform("logs_link" , "导出体力链接",`以链接形式导出所有存储在本地的加体力记录。`)
            addform("logs_all" , "导出调试信息",`导出所有存储在本地的脚本运行调试信息，包含加体力记录文本。`)
            addform("reset" , "脚本强制复位",`当脚本异常退出无法执行时可点击此按钮强制复位，后再手动执行脚本`)
            addform("position" , "设置面板位置",`设置刷新页面后面板位置 0:固定面板位置 1:点击关闭按钮时记录面板位置 -1:恢复默认位置(不影响是否固定)，默认0。`)

            let left=GM_getValue('setting left',"360px")
            let top=GM_getValue('setting top',"40px")
            $('#setting').css({"position":"fixed","z-index":"201","left":left,"top":top}) //*不知道为什么这段必须通过.css()添加为style不能通过.addClass()添加为class，否则Div无法被拖动，可能和论坛的dragMenu函数有关
            $('.o.pns>button').addClass("pn pnc z setting_button") //设置div_button添加css
            $('.o.pns').addClass("setting_div_left setting_div_height") //设置div添加css
            $('.o.pns:last').removeClass("setting_div_height") //设置最后一个div移除高度css
            $('.o.pns>div').addClass("setting_div_div") //设置div_div添加css
            $('.m_c>span').addClass("hide_button") //关闭按钮添加css
            $('#version').html("Version:"+version) //显示版本号

            $('#setting_hide').on("click",function(){
                if(position){
                    let left_=$('#setting').css("left")
                    let top_=$('#setting').css("top")
                    if (GM_getValue('setting left') != left_){GM_setValue(`setting left`,left_)}
                    if (GM_getValue('setting top') != top_){GM_setValue(`setting top`,top_)}
                }
                $('#setting').hide()}) //设置面板关闭按钮点击事件

            $('#main').on("click",function(){main()}) //手动执行脚本点击事件

            $('#autotime').on("click",function(){ //设置倒计时点击事件
                let autotime=prompt("自定义体力冷却倒计时刷新周期，单位毫秒，0为关闭显示，默认1000。",Autotime)
                if (autotime!=null && autotime!=""){
                    if(Number(autotime)>=0){
                        autotime=Number(autotime)
                        Autotime=autotime
                        GM_setValue("Autotime", autotime)
                        clearInterval(Timer)
                        Timer = setInterval(AutoTimer,Autotime)
                    }else{
                        (alert("Error\n设置倒计时输入错误，请输入非负数"))
                    }
                }
            })

            function HideAutorate_(){ //倒计时名称初始化
                if(HideAutoRate){
                    $('#hideautorate').html("倒计时显示名称")
                }else{
                    $('#hideautorate').html("倒计时隐藏名称")
                }
            }
            HideAutorate_()
            $('#hideautorate').on("click",function(){ //倒计时名称点击事件
                HideAutoRate = !HideAutoRate
                GM_setValue("HideAutoRate", HideAutoRate)
                HideAutorate_()
            })

            $('#precise').on("click",function(){ //精确倒计时点击事件
                let i
                if(PreciseCooldown){i=1}else{i=0}
                let precise=prompt("精确体力冷却倒计时 0:只在初始化时获取一次冷却时间 1:每个刷新周期获取一次冷却时间，默认1。",i)
                if (precise!=null && precise!=""){
                    switch(precise){
                        case "1":
                            PreciseCooldown = true
                            GM_setValue("PreciseCooldown", PreciseCooldown)
                            break
                        case "0":
                            PreciseCooldown = false
                            GM_setValue("PreciseCooldown", PreciseCooldown)
                            break
                        default:
                            alert("Error\n精确倒计时输入错误，请输入0或1")
                    }
                }
            })

            $('#debug_main').on("click",function(){ //设置运行模式点击事件
                let i
                if(debug_main){i=1}else{i=0}
                let debug_main_=prompt("是否开始debug加体力模式 0:正常运行速度，如遇bug需自行查看控制台 1:运行速度变慢，但较稳定，适合新手，默认0。",i)
                if (debug_main_!=null && debug_main_!=""){
                    switch(debug_main_){
                        case "1":
                            debug_main = true
                            GM_setValue("debug_main", debug_main)
                            break
                        case "0":
                            debug_main = false
                            GM_setValue("debug_main", debug_main)
                            break
                        default:
                            alert("Error\n设置运行模式输入错误，请输入0或1")
                    }
                }
            })

            $('#position').on("click",function(){ //设置面板位置点击事件
                let i
                if(position){i=1}else{i=0}
                let position_=prompt("设置刷新页面后面板位置 0:固定面板位置 1:点击关闭按钮时记录面板位置 -1：恢复默认位置(不影响是否固定)，默认0。",i)
                if (position_!=null && position_!=""){
                    switch(position_){
                        case "1":
                            position=true
                            GM_setValue("position", position)
                            break
                        case "0":
                            position=false
                            GM_setValue("position", position)
                            break
                        case "-1":
                            for (let log of GM_listValues()){if(log.slice(-4)=="left" || log.slice(-3)=="top"){GM_deleteValue(log)}}
                            break
                        default:
                            alert("Error\n设置面板位置输入错误，请输入0或1或-1")
                    }
                }
            })

            $('#delay').on("click",function(){ //倒计时延迟点击事件
                let delay_=prompt("自定义24小时体力冷却完毕后再次加体力时延迟，单位毫秒,最小为0，默认5000。",delay)
                if (delay_!=null && delay_!=""){
                    if(Number(delay_)>=0){
                        delay_=Number(delay_)
                        delay=delay_
                        GM_setValue("delay", delay)
                    }else{
                        (alert("Error\n倒计时延迟输入错误，请输入非负数"))
                    }
                }
            })

            $('#reset').on("click",function(){ //脚本强制复位点击事件
                if(GM_getValue("Status")!="Off"){
                    GM_setValue("Status","Off")
                    GM_setValue(getDate()+' reset','用户强制复位脚本')
                    alert("脚本已强制复位，已可手动执行脚本，如再次异常退出请联系作者提交异常情况。")}
                else{alert("脚本正常无须强制复位")}
            })

            $("#logs").on("click",()=>{New_Div("log_history","体力记录文本",export_log_history("text"))}) //导出体力文本点击事件

            $('#logs_link').on("click",()=>{New_Div("log_history_link","体力记录链接",export_log_history("link"))}) //导出体力链接点击事件

            $('#logs_all').on("click",()=>{New_Div("log_all","脚本调试信息",export_logs_all())}) //导出调试信息点击事件

            $('#update_log').on('click',()=>{New_Div("update_logs","更新日志",update_logs)}) //显示更新日志点击事件

            function export_log_history(method){ //导出体力记录
                let logs_=GM_listValues()
                let results=[]
                for (let log of logs_){
                    if(log.slice(-4)=="rate"){
                        let log_value=GM_getValue(log)
                        let tid=log_value.slice(log_value.search("tid:")+5,log_value.search("pid:")-1)
                        let pid=log_value.slice(log_value.search("pid:")+5,log_value.search("score:")-1)
                        switch (method){
                            case "link":
                                results.push(`<a href=https://keylol.com/forum.php?mod=redirect&goto=findpost&ptid=${tid}&pid=${pid}>https://keylol.com/forum.php?mod=redirect&goto=findpost&ptid=${tid}&pid=${pid}</a>\n`)
                                break
                            case "text":
                                results.push(`<a href=https://keylol.com/forum.php?mod=redirect&goto=findpost&ptid=${tid}&pid=${pid}>${log} : ${log_value}</a>\n`)
                                break
                        }
                    }
                }
                return results
            }

            function export_logs_all(){ //导出调试信息
                let logs_=GM_listValues()
                let results=[]
                for (let log of logs_){
                    let log_string=GM_getValue(log)
                    if(typeof log_string == "object"){log_string=JSON.stringify(log_string).replace(/,/g,",\n").replace(/\[/g,"[\n").replace(/\{/g,"{\n")} //object对象文本化
                    results.push(log+" : "+log_string+"\n")
                }
                return results
            }

            function New_Div(id,tittle,text){ //初始化Div
                if($(`#${id}`).length>0){
                    $(`#${id}`).toggle()
                    $(`#${id+"_text"}`).html(text) //动态更新文本
                }else{
                    let left=GM_getValue(`${id} left`,"320px")
                    let top=GM_getValue(`${id} top`,"40px")
                    $("body").append(addDiv(id)) //添加Div窗口
                    $(`#${id}`).css({"position":"fixed","z-index":"201","left":left,"top":top})//Div窗口添加css
                    $(`#${id+"_em"}`).html(tittle) //显示标题
                    $(`#${id+"_text"}`).html(text) //显示文本
                    $(`#${id+"_text"}`).addClass("div_text")//文本添加css
                    $(`#${id+"_hide"}`).on("click",function(){ //关闭按钮点击事件
                        if(position){
                            let left_=$(`#${id}`).css("left")
                            let top_=$(`#${id}`).css("top")
                            if (GM_getValue(`${id} left`) != left_){GM_setValue(`${id} left`,left_)}
                            if (GM_getValue(`${id} top`) != top_){GM_setValue(`${id} top`,top_)}
                        }
                        $(`#${id}`).hide()})
                }
            }

            function addDiv(id){ //添加Div窗口
                return `
<div id="${id}">
<table cellpadding="0" cellspacing="0"><tbody><tr><td class="t_l"></td><td class="t_c" style="cursor:move" onmousedown="dragMenu($('${id}'), event, 1)"></td>
<td class="t_r"></td></tr><tr><td class="m_l" style="cursor:move" onmousedown="dragMenu($('${id}'), event, 1)"></td>
<td class="m_c"><h3 class="flb" style="cursor: move;" onmousedown="dragMenu($('${id}'), event, 1)">
<em id="${id+"_em"}"></em>

<span><a href="javascript:;" class="flbc" id="${id+"_hide"}" >关闭</a></span>

</h3><form><div class="pbt cl">

<pre id="${id+"_text"}"></pre>

</div></form></td><td class="m_r" style="cursor:move" onmousedown="dragMenu($('${id}'), event, 1)"></td></tr>
<tr><td class="b_l"></td><td class="b_c" style="cursor:move" onmousedown="dragMenu($('${id}'), event, 1)"></td><td class="b_r"></td></tr></tbody></table></div>`
            }
        }}
})();