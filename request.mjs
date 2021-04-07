import https from 'https';

const BASE_OPTIONS = {
  hostname: 'maker.ifttt.com',
  port: 443,
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
  }
}

export function requestToSlack(value) {
  const options = {
    ...BASE_OPTIONS,
    path: `/trigger/${process.env.IFTTT_TRIGGER_NAME}/with/key/${process.env.IFTTT_WEBHOOK_TOKEN}`,
  };

  const payload = JSON.stringify({"value1" : value, "value2": "", "value3": ""});

  const req = https.request(options, (res) =>{
      if(res.statusCode === 200){
          console.log("OK:" + res.statusCode);
      }else{
          console.log("Status Error:" + res.statusCode);
      }
  });

  req.write(payload);
  
  req.end();
}