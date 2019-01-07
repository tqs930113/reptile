var https = require('https');
var http = require('http');
var cheerio = require('cheerio');
var superagent = require('superagent');
var fs = require('fs');

var host = 'https://www.glassdoor.com/';
var url = 'https://www.glassdoor.com/Salaries/us-salary-SRCH_IL.0,2_IN1.htm';

// 公司爬取进程
var companyProgressCount =0; 
// 公司职位爬取进程
var companyJobProgressCount = 0;
// 公司招聘职位信息表序号
var jobInfoIndex = 0;

var getCompany = (url) =>{
    // 获取公司
    superagent.get(url).end(function(err,res){
        // var 
        // console.log(res.text);
        // fs.writeFile('./file.html',res.text,function(err){
        //     console.log(err)
        // })
        var $ = cheerio.load(res.text);
        var listData = [];
        console.log('公司爬取：'+(++companyProgressCount));
        
        $('.srchSalaryEmployer.tbl.fill .tightVert.padBotSm  > a').each(function(index,el){
            var $el = $(el);
            var _url = host+$el.attr('href');
            var _companyName = $el.text().trim();
    
            listData.push({
                _url:_url,
                _companyName:_companyName
            });
        });
        if(listData.length > 0){
            listData.forEach(item =>{
                getCompanyJob(item._companyName,item._url);
            })
        }
        var nextPage = $('.pagingControls li.next > a');
        // var reg = /.*?(IP5.htm)$/ig;
        // var state = reg.test(nextPage.attr('href'));
        var state = false;
        if(nextPage.length >0 && !state){
            var logStr = '+++第'+companyProgressCount+'公司入库，属于页面url: '+host + nextPage.attr('href')+'\n';
            addLog(logStr);
           setTimeout(() => {
                getCompany(host + nextPage.attr('href'));
           }, 1000); 
           return false;
        }
        console.log('conpany reptile finished')
    })
}

var getCompanyJob = (_companyName,url) =>{
    // 获取公司职位
    superagent.get(url).end((err,res)=>{
        if(!res||!res.text){
            var date = new Date();
            var logStr = '---公司'+_companyName+'职位页面url: '+_jobUrl+' 未写入；时间：'+date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate+' '+date.getHours+':'+date.getMinutes+':'+date.getSeconds+'\n';
            addLog(logStr);
            return false;
        }
        var $ = cheerio.load(res.text);
        console.log(_companyName+'公司职位爬取：'+(++companyJobProgressCount));
        var jobListData =[];
        $('.JobInfoStyle__employerInfo > .JobInfoStyle__jobTitle > a').each((index,el) =>{
            var $el = $(el);
            jobListData.push({
                _jobName : $el.text().trim(),
                _jobUrl : host + $el.attr('href')
            });
        })
        if(jobListData.length > 0){
            jobListData.forEach(item =>{
                getCompanyJobSalaries(_companyName,item._jobName,item._jobUrl);
            })
        }
        var nextPage = $('.ArrowStyle__nextArrow > a');
        if(nextPage.length >0){
            setTimeout(() => {
                getCompanyJob(_companyName,host + nextPage.attr('href'));
           }, 1000); 
           return false;
        }
        console.log('conpany job reptile finished')
    })
}

var getCompanyJobSalaries = (_companyName,_jobName,_jobUrl) =>{
    // 获取公司职位的薪水数据
    superagent.get(_jobUrl).end((err,res)=>{
        if(!res||!res.text){
            var date = new Date();
            var logStr = '---公司'+_companyName+'职位'+_jobName+'薪水数据页面url: '+_jobUrl+' 未写入；时间：'+date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate+' '+date.getHours+':'+date.getMinutes+':'+date.getSeconds+'\n';
            addLog(logStr);
            return false;
        }
        var $=cheerio.load(res.text);
        var jobInfo = {
            index : ++jobInfoIndex,
            _jobUrl:_jobUrl,
            AvgBasePay:$('.DonutAndDataStyle__basePay .SalaryWithRangeStyle__basePay').text().trim(),
            AvgTotalPay:$('.DonutAndDataStyle__donut .DonutTwoSegmentStyle__amt').text().trim(),
            AvgAdditionalPay:$('.DonutAndDataStyle__additionalPay .SalaryWithRangeStyle__basePay').text().trim(),
            AdditionalPay:[]
        };  
        $('.AdditionalCompRowStyle__compRow').each((index,el)=>{
            var $el = $(el);
            var payName = $el.find('.AdditionalCompTableStyle__column1').text().trim().split('(')[0];
            var payNameCount = $el.find('.AdditionalCompTableStyle__column1 > .AdditionalCompRowStyle__count').text().trim();
            var rangeMin = $el.find('.AdditionalCompTableStyle__column3 .RangeBarStyle__rangeValues >span').eq(0).text().trim();
            var rangeMax = $el.find('.AdditionalCompTableStyle__column3 .RangeBarStyle__rangeValues >span').eq(2).text().trim();

            jobInfo.AdditionalPay.push({
                payName:payName,
                payNameCount:payNameCount,
                rangeMin:rangeMin,
                rangeMax:rangeMax
            });
        })
        printResult(_companyName,_jobName,jobInfo);
    })
}
var printResult = (_companyName,_jobName,_jobInfo) => {
    var fsSteam = '';
    fsSteam += '第'+(jobInfoIndex)+'条：';
    fsSteam += '公司名称:'+ _companyName+';---职位名称:'+_jobName+';---链接：<a href="'+_jobInfo._jobUrl+'">'+ _companyName+'</a>;---AvgBasePay:'+_jobInfo.AvgBasePay+';---AvgTotalPay:'+_jobInfo.AvgTotalPay+';---AvgAdditionalPay:'+_jobInfo.AvgAdditionalPay+'<br/>';
    _jobInfo.AdditionalPay.forEach( (item,index) =>{
        fsSteam += '++++++第'+(index+1)+'支付方式：---payName:'+item.payName+';---payNameCount:'+item.payNameCount+';---rangeMin:'+item.rangeMin+';--rangeMax:'+item.rangeMax+'<br/>';
    })
    fsSteam+='<br/>';
    fs.appendFile('./file.html',fsSteam,function(err) {
        
    })
}
var addLog = (logStr) =>{
    fs.appendFile('./log.txt',logStr,function(err) {
        
    });
}
(function main(){
    http.createServer(function(req,res){//回调函数
        res.writeHead(200,{'Content-Type':'text/html'});
        res.write("hello  world,")    
        res.end("service start!");
        getCompany(url);
    }).listen(8080);
})()