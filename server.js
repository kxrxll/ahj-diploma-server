const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
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

const messages = [];
const files = [];
const router = new Router();

router.post('/newmessage', async (ctx, next) => {
  messages.push(ctx.request.body);
  ctx.response.status = 200;
});

router.post('/favorite', async (ctx, next) => {
  const {id, isFavorite} = ctx.request.body;
  for (const item of messages) {
    if (item.id == id) {
      item.favorite = isFavorite;
    }
  }
  ctx.response.status = 200;
});

router.post('/search', async (ctx, next) => {
  const str = ctx.request.body.str;
  const searchArr = [];
  for (const item of messages) {
    if (item.message.includes(str)) {
      searchArr.push(item);
    }
  }
  ctx.response.body = JSON.stringify(searchArr);
  ctx.response.status = 200;
});

router.put('/download', async (ctx, next) => {
  files.push(ctx.request.body);
  ctx.response.body = JSON.stringify(files);
  /*
  const id = ctx.request.body.id;
  let result;
  for (const item of messages) {
    if (item.id == id) {
      result = item.attach;
    }
  }
  */
  ctx.response.status = 200;
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    [...wsServer.clients]
    .filter(o => o.readyState === WS.OPEN)
    .forEach(o => o.send(JSON.stringify(messages)));
  });
});

server.listen(port);