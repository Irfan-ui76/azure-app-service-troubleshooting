const { app } = require('@azure/functions');

// Timer trigger: needs the AzureWebJobsStorage connection to coordinate and store state.
app.timer('heartbeat', {
  schedule: '0 */1 * * * *', // every minute
  handler: (timer, context) => {
    context.log(`heartbeat fired at ${new Date().toISOString()}`);
  },
});

// HTTP trigger: used to check that the host itself is up.
app.http('ping', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async () => ({ body: 'pong' }),
});
