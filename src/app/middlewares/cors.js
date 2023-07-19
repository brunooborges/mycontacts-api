module.exports = (request, response, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://mycontacts.up.railway.app/',
    'https://mycontactsapi.up.railway.app/',
    'https://mycontactsapi.up.railway.app/categories',
  ];

  const origin = request.header('Origin');
  const isAllowed = allowedOrigins.includes(origin);

  if (isAllowed) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', '*');
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Access-Control-Max-Age', '10');
  }

  console.log(response);
  console.log(request);
  next();
};
