export const handler = async () => ({
  statusCode: 404,
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Not found' }),
});
