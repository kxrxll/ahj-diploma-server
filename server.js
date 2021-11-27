const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const uuid = require('uuid');
const app = new Koa();
const WS = require('ws');

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const users = [];
const messages = [];
const router = new Router();

router.post('/login', async (ctx, next) => {
  if (users.find(item => item.name === ctx.request.body.name)) {
    ctx.response.status = 409;
  } else {
    users.push({...ctx.request.body, id: uuid.v4()});
    ctx.response.status = 204;
  }
});

router.post('/newmessage', async (ctx, next) => {
  messages.push(ctx.request.body);
  ctx.response.status = 200;
});

router.delete('/delete/:name', async (ctx, next) => {
  users.splice(users.indexOf(ctx.params.name));
  ctx.response.status = 200
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    [...wsServer.clients]
    .filter(o => o.readyState === WS.OPEN)
    .forEach(o => o.send(JSON.stringify([users, messages])));
  });
  ws.on('close', (msg) => {
    users.pop();
    [...wsServer.clients]
    .filter(o => o.readyState === WS.OPEN)
    .forEach(o => o.send(JSON.stringify([users, messages])));
  });
  ws.send('connected');
});

server.listen(port);