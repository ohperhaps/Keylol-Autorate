// ==UserScript==
// @name         Keylol-Autorate
// @namespace    Keylol
// @include      https://keylol.com/forum.php
// @include      https://keylol.com/
// @require      https://code.jquery.com/jquery-3.5.1.min.js#sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=
// @version      1.0.9-DreamNya
// @icon         https://raw.githubusercontent.com/DreamNya/Keylol-Autorate/DreamNya-patch-1/img/konoha.png
// @downloadURL	 https://github.com/DreamNya/Keylol-Autorate/raw/DreamNya-patch-1/keylol-autorate.user.js
// @updateURL	 https://github.com/DreamNya/Keylol-Autorate/raw/DreamNya-patch-1/keylol-autorate.user.js
// @description  Keylol forum autorate tool
// @author       DreamNya
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==
/*
更新日志：
1.version 1.0.8-DreamNya（2020-08-26）
a.在原作者ohperhaps 1.0.7版本基础上新增登陆论坛无需点击Autorate按钮自动加体力功能（首次使用需要手动点击按钮）。
b.增加Autorate按钮显示体力冷却倒计时功能（hh:mm:ss格式）。默认开启，每隔1000毫秒刷新一次。
  脚本编辑页面开头可自定义刷新时间const Autotime = 1000;（修改默认1000的为目标时间，单位毫秒，0为关闭显示）
c.修改脚本只有在论坛主页才会生效，以加快论坛加载速度。

2.version 1.0.9-DreamNya（2020-09-16）
a.修复冷却完毕时的计时器bug
b.新增加体力延迟、精确冷却倒计时功能
c.重写main()中获取帖子加体力的逻辑(未测试同时加多个收藏贴的功能 不推荐同时加多个收藏贴 可能存在bug)
d.存储已加体力tid pid信息，进一步优化加体力速度
e.存储运行日志，方便debug以及记录体力操作信息

计划中：
a.增加存储debug信息开关。目前需要手动删除debug注释
 */

const Autotime = 1000; //自定义体力冷却倒计时刷新周期，单位毫秒，0为关闭显示。
const HideAutorate = false; //显示体力冷却时是否隐藏Autorate文字 true:hh:mm:ss / false:Autorate hh:mm:ss
const delay = 5000; //自定义24小时体力冷却完毕后加体力延迟，单位毫秒
const PreciseCooldown = false; //精确体力冷却倒计时 false:只在初始化时获取一次冷却时间 true:每个刷新周期获取一次冷却时间
//const debug = 3; //0:不存储除体力冷却体力操作以外的任何信息 1:存储有限debug信息 2:存储大量debug信息 3:1+2

(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;
    const homePage = "https://keylol.com/";
    const selfUid = $("li.dropdown").find("a").attr("href").split("-")[1]
    const formHash = $("[name=formhash]").val();
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
        let time = [new Date().getFullYear(),check(new Date().getMonth()+1),check(new Date().getDate())].join('-')+' '+[new Date().getHours(),check(new Date().getMinutes()),check(new Date().getSeconds()),check(new Date().getMilliseconds())].join(':')
        //GM_setValue(time+' updateQuote',[favid, quote])
        formData.append("favid", favid)
        formData.append("quote", quote)
        return xhrAsync(`plugin.php?id=keylol_favorite_notification:favorite_enhance&formhash=${formHash}`, "POST", formData).then((res) => {
            //GM_setValue(time+' updateQuoteres',res)
            //GM_setValue(time+' updateQuoteres.responseText',res.responseText)
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
    async function main() {
        let message = []
        let time = [new Date().getFullYear(),check(new Date().getMonth()+1),check(new Date().getDate())].join('-')+' '+[new Date().getHours(),check(new Date().getMinutes()),check(new Date().getSeconds()),check(new Date().getMilliseconds())].join(':')
        let itemScores = await calcScores()
        let page =1
        let RateRecord=GM_getValue('RateRecord') //读取tid pid记录
        let tid=[]
        let pid=[]
        let newtid=[]
        let newpid=[]
        if (RateRecord){
            tid=RateRecord.tid //读取tid记录
            pid=RateRecord.pid //读取pid记录
        }
        //GM_setValue(time+' itemScores',itemScores)
        if (itemScores[0].length === 0) {
            message.push('未找到正确格式的收藏帖子！\n')
            GM_setValue(time+' result','未找到正确格式的收藏帖子！')
        }
        while (itemScores[0].length >0){
            if (itemScores[1] === 0) {
                message.push('当前无剩余体力！请稍后再尝试！\n')
                GM_setValue(time+' result','当前无剩余体力！请稍后再尝试！')
                break
            }else{
                body:
                while(page<51){
                    let replys = await getUserReplys(itemScores[0][0].uid, page)
                    time = [new Date().getFullYear(),check(new Date().getMonth()+1),check(new Date().getDate())].join('-')+' '+[new Date().getHours(),check(new Date().getMinutes()),check(new Date().getSeconds()),check(new Date().getMilliseconds())].join(':')
                    while (replys.length > 0 ){
                        //GM_setValue(time+' itemScores[0][0].uid, page, replys',[itemScores[0][0].uid, page, replys])
                        if (itemScores[0][0].score > 0) { //剩余体力
                            let attend = Math.min(itemScores[0][0].step, itemScores[0][0].score) //每次加体力数
                            let new_quote = formatQuote(itemScores[0][0].quote, attend)[0] //体力说明计数
                            if (RateRecord){
                                for (let Record of pid){if (replys[0].pid == Record){replys.shift}} //对比pid记录 存在则直接跳过 减少POST
                                if (!replys.length>0){break}
                            }
                            let rate_result = await rate(replys[0].tid, replys[0].pid, attend, new_quote)
                            time = [new Date().getFullYear(),check(new Date().getMonth()+1),check(new Date().getDate())].join('-')+' '+[new Date().getHours(),check(new Date().
getMinutes()),check(new Date().getSeconds()),check(new Date().getMilliseconds())].join(':')
                            /*GM_setValue(time+" rate_log",{replys_tid: replys[0].tid,
                                                          replys_pid: replys[0].pid,
                                                          attend: attend,
                                                          new_quote: new_quote,
                                                          rate_result: rate_result})*/
                            if (rate_result === 'successful') {
                                itemScores[0][0].score -= attend
                                itemScores[0][0].quote = new_quote
                                //GM_setValue(time+" successful itemScores[0][0].score",itemScores[0][0].score)
                                //GM_setValue(time+" successful itemScores[0][0].quote",itemScores[0][0].quote)
                                GM_setValue('Ratetime', new Date().getTime()) //记录加体力时间
                                Cooldown = 86400000+delay
                                GM_setValue(time+" rate",`user: ${itemScores[0][0].username} tid: ${replys[0].tid}  pid: ${replys[0].pid} score: ${attend} reason:${new_quote}`) //记录加体力结果
                                message.push(`user: ${itemScores[0][0].username} tid: ${replys[0].tid}  pid: ${replys[0].pid} score: ${attend} reason:${new_quote}\n`)
                                //updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                            } else if (rate_result === 'exceeded') {
                                //GM_setValue(time+" exceeded itemScores[0][0].score",itemScores[0][0].score)
                                //GM_setValue(time+" exceeded itemScores[0][0].quote",itemScores[0][0].quote)
                                updateQuote(itemScores[0][0].favid, itemScores[0][0].quote)
                                GM_setValue(time+' result','当前体力已全部加完!')
                                message.push('当前体力已全部加完!\n')
                                break body
                            }
                            newtid.push(replys[0].tid) //记录本次tid
                            newpid.push(replys[0].pid) //记录本次pid
                        }else {
                            //GM_setValue(time+" end itemScores[0][0].score",itemScores[0][0].score)
                            //GM_setValue(time+" end itemScores[0][0].quote",itemScores[0][0].quote)
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
        if (newpid.length >0){ //存储tid pid记录
            newtid=newtid.concat(tid)
            newpid=newpid.concat(pid)
            RateRecord={tid: newtid,
                        pid: newpid}
            GM_setValue('RateRecord',RateRecord)
        }
        alert(message.join(''))
        Timer = setInterval(AutoTimer,Autotime) //重启倒计时冷却
    }
    function views() {
        let rateDiv = $('<div/>', {id: 'rateDiv'})
        let rateBtn = $('<a/>', {
            id: 'autoRate',
            html: 'Autorate',
            class: 'btn btn-user-action',
            mouseover: function () { $(this).css({'background-color': '#57bae8', 'color': '#f7f7f7'}) },
            mouseleave: function () { $(this).css({'background-color': '', 'color': ''}) },
            click: function () { main() }})
        rateDiv.append(rateBtn)
        $('#nav-search-bar').after(rateDiv)
    }
    function check(val) { //优化显示体力冷却时间
        if (val < 10) {
            return ("0" + val)
        }
        else if(60<val && val<100) {
            return ("0" + val)
        }
        else{
            return (val)
        }
    }
    function AutoTimer() { //自动加体力
        if (PreciseCooldown){
            Cooldown=GM_getValue('Ratetime')+86400000+delay-new Date().getTime()
        }else{
            Cooldown -=Autotime
        }
        let Hour = Math.floor(Cooldown/1000/3600)
        let Minute = Math.floor((Cooldown-Hour*1000*3600)/1000/60)
        let Second = Math.floor((Cooldown-Hour*1000*3600-Minute*1000*60)/1000)
        let time =[check(Hour),check(Minute),check(Second)].join(':')
        if (Cooldown <0) { //判断体力冷却是否结束
            let time_debug =new Date().getTime()
            Cooldown=GM_getValue('Ratetime')+86400000+delay-time_debug //精确冷却时间
            if (Cooldown <1){
                GM_setValue(time_debug, Cooldown) //记录加体力时间
                clearInterval(Timer)
                Timer = null
                main()
            }
        }
        else if(Cooldown >1 && Autotime >0 ){ //体力冷却中
            if (HideAutorate == false) { //显示体力冷却时间
                $('#autoRate').html('Autorate<br/>'+time)
            }
            else{
                $('#autoRate').html(time)
            }
            if(Timer == null){
                Timer = setInterval(AutoTimer,Autotime) //设置显示体力冷却时间计时器
            }
        }
    }
    views()
    let init =GM_getValue('Ratetime')
    if (init){
        var Cooldown=init+86400000+delay-new Date().getTime() //获取体力冷却时间
        var Timer = null
        AutoTimer()
    }

})();
