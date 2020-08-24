// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const http = require('http');
const host = 'newsapi.org';
const ApiKey = 'a9f7fc02c9414f67b14d416b9d994d55';
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
//  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
//  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function newsHandler(agent) {
    let company_name = request.body.queryResult.parameters['Company_Name'];
    let date = request.body.queryResult.parameters['date'];

    return callNewsApi(company_name, date.split('T')[0]).then((output) => {
      agent.add(output);
      agent.add(`Go ahead and say another company to get news.`);
    }).catch(() => {
      agent.add(`I don't know the news but I hope it's good!`);
    });
  }
  
  function news_moreHandler(agent) {
    const newsContext = agent.getContext('news-followup');
    const company_name = newsContext.parameters.Company_Name;
    const date = newsContext.parameters.date;
    
    return callNewsApi(company_name, date.split('T')[0]).then((output) => {
      agent.add(output);
      agent.add(`Go ahead and say another company to get news.`);
    }).catch(() => {
      agent.add(`I don't know the news but I hope it's good!`);
    });
  }
  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
//  intentMap.set('Default Welcome Intent', welcome);
//  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('news', newsHandler);
//  intentMap.set('news_more', news_moreHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});

function callNewsApi(company, date) {
  return new Promise((resolve, reject) => {
    let path = '/v2/everything?q=' + company + '&from=' + date + '&to=' + date + '&language=en' + '&sortBy=popularity' + '&apiKey=' + ApiKey;
    console.log('API Request: ' + path);
    
    http.get({host: host, path: path}, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        let response = JSON.parse(body);
        let idx = 0;
        let title = response['articles'][idx]['title'];
        
        while (title.indexOf(company) < 0) {
          idx++;
          title = response['articles'][idx]['title'];
        }
        
        let source = response['articles'][idx]['source']['name'];
        let description = response['articles'][idx]['description'];
        let url = response['articles'][idx]['url'];
        let urlToImage = response['articles'][idx]['urlToImage'];
        let output = new Card({
          title: title,
          text: description,
          imageUrl: urlToImage,
          buttonText: 'View in the webpage',
          buttonUrl: url
        });
        
        console.log(output);
        resolve(output);
      });
      res.on('error', (error) => {
        console.log(`Error calling the weather API: ${error}`)
        reject();
      });
    });
  });
}