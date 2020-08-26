// ==UserScript==
// @name         Keylol-Autorate
// @namespace    Keylol
// @include      https://keylol.com/forum.php
// @include      https://keylol.com/
// @require      https://code.jquery.com/jquery-3.5.1.min.js#sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=
// @version      1.0.8-DreamNya
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
 */

const Autotime = 1000; //自定义体力冷却倒计时刷新时间，单位毫秒，0为关闭显示。
const HideAutorate = false; //显示体力冷却时是否隐藏Autorate文字 true:hh:mm:ss / false:Autorate hh:mm:ss

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
        formData.append("favid", favid)
        formData.append("quote", quote)
        return xhrAsync(`plugin.php?id=keylol_favorite_notification:favorite_enhance&formhash=${formHash}`, "POST", formData).then((res) => {
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
        let itemScores = await calcScores()
        console.log(itemScores)
        if (itemScores[0].length === 0) { message.push('未找到正确格式的收藏帖子！\n') }
        body:
        for (let item of itemScores[0]) {
            if (itemScores[1] === 0) { message.push('当前无剩余体力！请稍后再尝试！\n'); break }
            leg:
            for(let page = 1; page < 50; page++) {
                let replys = await getUserReplys(item.uid, page)
                console.log([item.uid, page, replys])
                for(let reply of replys) {
                    if (item.score > 0) {
                        let attend = Math.min(item.step, item.score)
                        let new_quote = formatQuote(item.quote, attend)[0]
                        let rate_result = await rate(reply.tid, reply.pid, attend, new_quote)
                        if (rate_result === 'successful') {
                            item.score -= attend
                            item.quote = new_quote
                            GM_setValue('Ratetime', new Date().getTime()); //记录加体力时间
                            message.push(`user: ${item.username} tid: ${reply.tid}  pid: ${reply.pid} score: ${attend} reason:${new_quote}\n`)
                        } else if (rate_result === 'exceeded') {
                            updateQuote(item.favid, item.quote)
                            message.push('当前体力已全部加完!\n')
                            break body
                        }
                    } else {
                        updateQuote(item.favid, item.quote)
                        break leg
                    }
                }
            }
        }
        alert(message.join(''))
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
            return ("0" + val);
        }
        else {
            return (val);
        }
    }
    function AutoTimer() { //自动加体力
        let Cooldown=GM_getValue('Ratetime')+86400000-new Date().getTime() //获取体力冷却时间
        //console.log(Cooldown)
        if (Cooldown <1) { //判断体力冷却是否结束
            main()
        }
        else if(Cooldown >1 && Autotime >0 ){ //体力冷却中
            let Hour = Math.floor(Cooldown/1000/3600)
            let Minute = Math.floor((Cooldown-Hour*1000*3600)/1000/60)
            let Second = Math.floor((Cooldown-Hour*1000*3600-Minute*1000*60)/1000)
            if (HideAutorate == false) {
                $('#autoRate').html('Autorate<br/>'+check(Hour)+':'+check(Minute)+':'+check(Second)) //显示体力冷却时间
            }
            else{
                $('#autoRate').html(check(Hour)+':'+check(Minute)+':'+check(Second)) //显示体力冷却时间
            }
        }
    }
    views()
    AutoTimer()
    if(Autotime>0){
        var Timer = setInterval(AutoTimer,Autotime) //设置显示体力冷却时间计时器
        }
})();
