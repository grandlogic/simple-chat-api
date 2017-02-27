import http from 'http';
import express from 'express';
import cors from 'cors';
import io from 'socket.io';
import config from '../config/config.json';
import path from 'path';
import apiai from 'apiai'

//var unirest = require('unirest');
var RestClient = require('node-rest-client').Client;

// setup server
const app = express();
const server = http.createServer(app);
const appai = apiai('3fa1d40611854eb681359a2b5473de9d');

var twilioAccountSid = 'AC1ad049e8b5fa61f35914cab353cb6d32'; 
var twilioAuthToken = '3f353bdd3c97c3ebb605b86fa5e02ee5'; 
var twilioClient = require('twilio')(twilioAccountSid, twilioAuthToken);

const socketIo = io(server);

const restClient = new RestClient();

// Allow CORS
app.use(cors());

var formatDollar = function(n, currency) {
    var nn = Number(n);
    return currency + " " + nn.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
}

// Render a API index page
app.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

//webhook from SMS sent to bot
app.get('/sms_webhook', (req, res) => {

  console.log('sms msg: ' + req.query.Body);

  //make API.ai call
  var appaiRequest = appai.textRequest(req.query.Body, { sessionId: 'aaaaa'});
    appaiRequest.on('response', function(response) {

    //res.send('sms replay stuff');

    res.send('<?xml version="1.0" encoding="UTF-8" ?>' +
           '<Response>' +
              '<Message>' + response.result.fulfillment.speech + '</Message>' +
           '</Response>');
    
      console.log(response);
    });
 
    appaiRequest.on('error', function(error) {
      console.log(error);
    });
   
    appaiRequest.end();
});

// Start listening
server.listen(process.env.PORT || config.port);
console.log(`Started on port ${config.port}`);

// Setup socket.io
socketIo.on('connection', socket => {
  const username = socket.handshake.query.username;
  console.log(`${username} connected`);

  socket.on('client:message', data => {

    console.log('MESSAGE  ' + data.username + ':::' + data.message);
    
    // message received from client, now broadcast it to everyone else
    //socket.broadcast.emit('server:message', data);

    const invokingUser = data.username;

    //data.username = 'Tsy';
    data.username = 'Sweetpi';

    if(data.message == 'First-Contact')
    {
      data.message = 'Hi ' + invokingUser + ', how can I help you?';
      data.uxdyno= { uxbtns: [] };
      console.log('Server Firstcontact 1');
      socket.emit('server:message', data);
      return;
    }
    else if(data.message == "make rest call")
    {
      restClient.get("http://localhost:8090/api/sweetpi/v0/payroll/random", function (restParams, restResponse) {
        // parsed response body as js object 
        console.log('Make rest call data:' + data);
        // raw response 
        console.log('Make rest call response:' + restParams.randomNumber);
        console.log(restParams);
        //console.log(restResponse);
        data.message = 'OK'
        socket.emit('server:message', data);
      });
      return;

    }
    else
    {
      //console.log('RESPONDING_1');

      //make API.ai call
      var appaiRequest = appai.textRequest(data.message, { sessionId: 'aaaaa'});

      appaiRequest.on('response', function(response) {

        console.log(response);

        if(response.result.score < .70) 
        {
          data.message = 'Sorry, I did understand that?'
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_random_num')
        {
          restClient.get("http://localhost:8090/api/sweetpi/v0/payroll/random", function (restParams, restResponse) {
            console.log(restParams);
            // raw response 
            //console.log('Random number: ' + restResponse);

            data.message = response.result.fulfillment.speech + ' ' + restParams.randomNumber;
            socket.emit('server:message', data);
          });
          return;
        }
        else if(response.result.action == 'input.unknown')
        {
          data.message = response.result.fulfillment.speech;
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_to_greeting')
        {
          data.message = response.result.fulfillment.speech + ' ' + invokingUser + '.';
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_product_service_news')
        {
          data.message = 'There are few new things you might be interested in. See <a target="_blank" href="http://google.com">here</a>.';
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_job_openings')
        {
          data.message = 'There are 3 openings. See <a target="_blank" href="http://google.com">details</a>.';
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_your_welcome')
        {
          data.message = 'You are welcome' + ' ' + invokingUser;
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'found_hr_form')
        {
          if(response.result.actionIncomplete == true)
            data.message = response.result.fulfillment.speech;
          else
            data.message =  'Here you go, download the ' + response.result.parameters.HR_DOCS + ' document from <a target="_blank" href="http://google.com">here</a>.';

          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'setup_payroll_alert')
        {
          data.message = 'Hi ' + invokingUser + ', can you please confirm how you would like to receive payroll run alerts.';
          data.uxdyno= { uxbtns: [] };
          data.uxdyno.uxbtns.push('By SMS');
          data.uxdyno.uxbtns.push('By Email');
          data.uxdyno.uxbtns.push('Cancel');

          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_help_info')
        {
          data.message = response.result.fulfillment.speech;
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_to_user_leaving')
        {
          data.message = response.result.fulfillment.speech;
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_to_cool_great')
        {
          data.message = response.result.fulfillment.speech;
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_with_ee_with_birthdays') /////////////////////////////
        {
          data.message = 'There are 4 people with birthdays this month. They are:';
          data.uxstatic='<table style="border-collapse: collapse; border: 1px solid black;">' + 
                          '<tr><td><b>Steve Austin</b></td><td><b>January 25th</b></td></tr>' +
                          '<tr><td><b>Bob Jackson</b></td><td><b>January 27th</b></td></tr>' +
                          '<tr><td><b>Mary Jones</b></td><td><b>January 24th</b></td></tr>' +
                          '<tr><td><b>Lisa Smith</b></td><td><b>January 29th</b></td></tr>' +
                        '</table>';
          socket.emit('server:message', data);
          return;
        }
        else if(response.result.action == 'respond_average_payrun') ////////////////////////////////////
        {
          var group_name = response.result.contexts[0].parameters.group_name;
          var payroll_year = response.result.contexts[0].parameters.payroll_year;
          if(group_name == undefined)
          {
            data.message = 'Sorry, you must first define what pay group you are interested in.';
            socket.emit('server:message', data);
            return;
          }

          restClient.get('http://localhost:8090/api/sweetpi/v0/payroll/' + group_name + '/payrunAvg', function (restParams, restResponse) {
            console.log(restParams);
            console.log('Length: ' + restParams.length);
   
            data.message = 'Here are the average payroll details for ' + group_name + ' in ' + payroll_year + ':';

            data.uxstatic='<table cellpadding="6" style="border-collapse: collapse; border: 1px solid black;"><tr><th>Avg Gross</th><th align=center>Avg Net</th></tr>';
            data.uxstatic += '<tr><td>' + formatDollar(restParams.gross, '$') + '</td><td align=center>' + formatDollar(restParams.net, '$') + '</td></tr>';
            data.uxstatic += '</table>';
            socket.emit('server:message', data);
            
          }); 
          return;
        }
        else if(response.result.action == 'respond_show_top_paychecks') ///////////////////////////////
        {
          var group_name = response.result.contexts[0].parameters.group_name;
          var order = response.result.contexts[0].parameters.ordinal;
          if(group_name == undefined || order == undefined)
          {
            data.message = 'Sorry, you must first define what pay group and payrun you are interested in.';
            socket.emit('server:message', data);
            return;
          }
          if(response.result.actionIncomplete)
          {
            data.message = response.result.fulfillment.speech;
            socket.emit('server:message', data);
            return;
          }
         
          var paytype = response.result.contexts[0].parameters.EARN_TYPE;

          var url = 'http://localhost:8090/api/sweetpi/v0/payroll/' + group_name + '/paycheck/top/' + paytype + '?order=' + order;
          console.log('WS URL: ' + url);
          restClient.get(url, function (restParams, restResponse) {
            console.log(restParams);

            //data.message="got it";
            //socket.emit('server:message', data);

            if( !(restParams instanceof Array) || restParams.length == 0)
            {
              data.message = 'Sorry, I can\'t find anyone by that last name.';
              socket.emit('server:message', data);
              return;
            }

            if(restParams.length > 1)
              data.message = 'Here are the top 10 related paychecks for '+ group_name + ':';
            else
              data.message = 'Here you go:';

            data.uxstatic='<table cellpadding="6" style="border-collapse: collapse; border: 1px solid black;"><tr><th>ID</th><th>First Name</th><th align=center>Last Name</th><th align=center>Address</th>';
            data.uxstatic += '<th align=center>State</th><th align=center>Gross</th><th align=center>Net</th><th align=center>Bonus</th>';
            data.uxstatic += '</tr>';
            function payrunLister(item, index) {
              data.uxstatic += '<tr><td align=center>' + item.workerId + '</td><td align=center>' + item.firstname + '</td>';
              data.uxstatic += '<td align=center>' + item.lastname + '</td><td align=center>' + item.address1 + '</td>';
              data.uxstatic += '<td align=center>' + item.state + '</td><td align=center>' + formatDollar(item.gross, '$') + '</td>';
              data.uxstatic += '<td align=center>' + formatDollar(item.net, '$') + '</td>';
              data.uxstatic += '<td align=center>' + formatDollar(item.bonus, '$') + '</td></tr>';
            }      

            restParams.forEach(payrunLister);
            data.uxstatic += '</table>';
            socket.emit('server:message', data);            
          }); 
          return;
        }
        else if(response.result.action == 'respond_individual_paycheck_summary') /////////////////////////////
        {
          if(response.result.actionIncomplete)
          {
            data.message = response.result.fulfillment.speech;
            socket.emit('server:message', data);
            return;
          }
          var group_name = response.result.contexts[0].parameters.group_name;
          var order = response.result.contexts[0].parameters.ordinal;
          var lastname = response.result.contexts[0].parameters.lastname;
          var url = 'http://localhost:8090/api/sweetpi/v0/payroll/' + group_name + '/paycheck/' + lastname + '?order=' + order;
          console.log('WS URL: ' + url);
          restClient.get(url, function (restParams, restResponse) {
            console.log(restParams);

            //data.message="got it";
            //socket.emit('server:message', data);

            if( !(restParams instanceof Array) || restParams.length == 0)
            {
              data.message = 'Sorry, I can\'t find anyone by that last name.';
              socket.emit('server:message', data);
              return;
            }

            if(restParams.length > 1)
              data.message = 'Found more than one person in '+ group_name + ' with that last name:';
            else
              data.message = 'Here you go:';

            data.uxstatic='<table cellpadding="6" style="border-collapse: collapse; border: 1px solid black;"><tr><th>ID</th><th>First Name</th><th align=center>Last Name</th><th align=center>Address</th>';
            data.uxstatic += '<th align=center>State</th><th align=center>Gross</th><th align=center>Net</th>';
            data.uxstatic += '</tr>';
            function payrunLister(item, index) {
              data.uxstatic += '<tr><td align=center>' + item.workerId + '</td><td align=center>' + item.firstname + '</td>';
              data.uxstatic += '<td align=center>' + item.lastname + '</td><td align=center>' + item.address1 + '</td>';
              data.uxstatic += '<td align=center>' + item.state + '</td><td align=center>' + formatDollar(item.gross, '$') + '</td>';
              data.uxstatic += '<td align=center>' + formatDollar(item.net, '$') + '</td></tr>';
            }      

            restParams.forEach(payrunLister);
            data.uxstatic += '</table>';
            socket.emit('server:message', data);            
          }); 
          return;

        }
        else if(response.result.action == 'respond_show_payperiod_details_byorder') //////////////////////////////
        {
          if(response.result.actionIncomplete)
          {
            data.message = response.result.fulfillment.speech;
            socket.emit('server:message', data);
            return;
          }

          var group_name = response.result.contexts[0].parameters.group_name;
          var order = response.result.parameters.ordinal;
          var url = 'http://localhost:8090/api/sweetpi/v0/payroll/' + group_name + '/payrunDetails?order=' + order;
          console.log('WS URL: ' + url);
          restClient.get(url, function (restParams, restResponse) {
            console.log(restParams);

            //data.message="got it";
            //socket.emit('server:message', data);

            if(restParams.payrunDate == undefined || restParams.payrunDate == null)
            {
              data.message = 'Sorry, cound not find this payrun :(';
              socket.emit('server:message', data);
            }
            else {
              data.message = 'Here are more details on group '+ group_name + ' for pay period ending: ' + restParams.payrunDate;

              data.uxstatic='<table cellpadding="6" style="border-collapse: collapse; border: 1px solid black;"><tr><th>Pay Checks</th><th align=center>Net Pay</th><th align=center>Gross Pay</th></tr>';
              data.uxstatic += '<tr><td align=center>' + restParams.payrunCount + '</td><td align=center>' + formatDollar(restParams.net, '$') + '</td><td align=center>' + formatDollar(restParams.gross, '$') + '</td></tr>';
              data.uxstatic += '</table>';
              socket.emit('server:message', data);
            }
          }); 
          return;
        }
        else if(response.result.action == 'respond_show_payruns') /////////////////////////////////////
        {
          if(response.result.actionIncomplete)
          {
            data.message = response.result.fulfillment.speech;
            socket.emit('server:message', data);
            return;
          }

          var group_name = response.result.contexts[0].parameters.group_name;

          restClient.get('http://localhost:8090/api/sweetpi/v0/payroll/' + group_name + '/payruns', function (restParams, restResponse) {
            console.log(restParams);
            console.log('Length: ' + restParams.length);

            if(restParams.length == 0)
            {
              data.message = 'Sorry, ' + '"' + group_name + '"' + ' has zero payruns :(';
              socket.emit('server:message', data);
            }
            else {
              data.message = 'Found ' + restParams.length + ' payruns for ' + group_name + '. Here you go:';

              data.uxstatic='<table cellpadding="6" style="border-collapse: collapse; border: 1px solid black;"><tr><th>Period End-Date</th><th align=center>Paid Workers</th></tr>';
              function payrunLister(item, index) {
                data.uxstatic += '<tr><td>' + item.payrunDate + '</td><td align=center>' + item.payrunCount + '</td></tr>';
              }      

              restParams.forEach(payrunLister);
              data.uxstatic += '</table>';
              socket.emit('server:message', data);
            }
          }); 
          return;
        }
        else if(response.result.action == 'show_paycheck') /////////////////////////////
        {
          if(response.result.parameters.pay_point_in_time == 'next')
          {
            data.message = 'Here is what your paycheck is looking like so far for the next pay cycle:';
            data.uxstatic='<table style="border-collapse: collapse; border: 1px solid black;">' + 
                            '<tr><td>Gross:</td><td><b>$3,500.00</b></td></tr>' +
                            '<tr><td>Net:</td><td><b>$3,000.00</b></td></tr>' +
                            '<tr><td>Taxes:</td><td><b>$700.00</b></td></tr>' +
                            '<tr><td>Medical:</td><td><b>$800.00</b></td></tr>' +
                          '</table>';
          }
          else
          {
            data.message = 'Here is a breakdown summary of your ' + response.result.parameters.pay_point_in_time + ' paycheck:';
            data.uxstatic='<table style="border-collapse: collapse; border: 1px solid black;">' + 
                            '<tr><td>Gross:</td><td><b>$2,500.00</b></td></tr>' +
                            '<tr><td>Net:</td><td><b>$2,000.00</b></td></tr>' +
                            '<tr><td>Taxes:</td><td><b>$500.00</b></td></tr>' +
                            '<tr><td>Medical:</td><td><b>$500.00</b></td></tr>' +
                          '</table>';
          }
          socket.emit('server:message', data);
          return;
        }
        else //////////////////////////////////////
        {
          data.message = 'Sorry, did not get that?'
          socket.emit('server:message', data);
          return;
        }


        data.message = response.result.fulfillment.speech;
        data.ux='plain ux';
        data.uxdyno= { uxbtns: [] }; //{[ {name: 'Confirm'}, {name: 'Cancel'} ]};
        data.uxdyno.uxbtns.push('Confirm');
        data.uxdyno.uxbtns.push('Cancel');
        console.log('RESPONDING_2');
        console.log(data.uxdyno.uxbtns);
        console.log(`${data.username}:::: ${data.message}`);



         /*
        twilioClient.messages.create({ 
          to: "+17703768702", 
          from: "+16789670296", 
          body: "Tsy: Welcome to TotalSource!", 
          //mediaUrl: "https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg",  
        }, function(err, message) { 
          console.log(message.sid); 
        });*/
      
        socket.emit('server:message', data);

        console.log(response);
      });
   
      appaiRequest.on('error', function(error) {
        console.log(error);
      });
     
      appaiRequest.end();
    }
    
  });

  // "+17703768702"
  function sendSMS(userMessage, toPhone) {
    twilioClient.messages.create({ 
          to: toPhone, 
          from: "+16789670296", 
          body: userMessage, 
          //mediaUrl: "https://c1.staticflickr.com/3/2899/14341091933_1e92e62d12_b.jpg",  
        }, function(err, message) { 
          console.log(message.sid); 
        });
  }

  socket.on('client:command', data => {
    
    console.log('got a command:' + data.command);

    //data.username = 'Tsy';
    data.username = 'Sweetpi';

    data.message = 'Ok, I will send you SMS notifications when payroll runs!'
    socket.emit('server:message', data);

    //Kay mobile: +17708253589
    //My mobile:  +17703768702
    if(data.command == 'By SMS')
    {
      sendSMS('Your company payroll has been run!', '+17703768702');
    }
    
  });

  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
  });
});

export default app;
