/** Turns errors into plain status codes: client mistakes keep their 4xx, the rest is a 500. */
module.exports = (error, request, response, next) => {
  const status = error.status || error.statusCode;

  if (status >= 400 && status < 500) {
    response.sendStatus(status);
    return;
  }

  console.log(error);
  response.sendStatus(500);
};
