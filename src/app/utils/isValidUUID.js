function isValidUUID(string) {
  // eslint-disable-next-line operator-linebreak
  const regex =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

  return regex.test(string);
}

module.exports = isValidUUID;
