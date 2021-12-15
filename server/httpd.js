const express = require('express')
const apicache = require('apicache')
const settings = require(__dirname + '/settings.js');
const wienerLinien = require(__dirname + '/wiener-linien.js');
const oebb = require(__dirname + '/oebb.js');

let app = express()
let cache = apicache.middleware

app.use(express.static(__dirname + '/../site'));

app.get('/api', cache(settings.api_cache_msec), async (req, res) => {
	console.log('API: new request')
	const wienerLinienResponse = await wienerLinien.getData();
	const oebbResponse = await oebb.getData();
	const status = wienerLinienResponse.status == 'ok' && oebbResponse.status == 'ok' ? 'ok' : 'error'
	const departures = [...wienerLinienResponse.departures, ...oebbResponse.departures]
	departures.sort((a, b) => {
		return (a.time < b.time) ? -1 : ((a.time > b.time) ? 1 : 0);
	})
	const warnings = [...wienerLinienResponse.warnings, ...oebbResponse.warnings]
	responseData = { status: status, departures: departures, warnings: warnings }
	res.json(responseData)
})

app.listen(settings.listen_port, () => {
	console.log('Server up on port', settings.listen_port);
});