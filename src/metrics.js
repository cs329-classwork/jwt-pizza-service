const os = require("os")
const config = require("./config")
const { glob } = require("fs")

// globals
const globals = {
  totalRequests: 0,
  getRequests: 0,
  putRequests: 0,
  postRequests: 0,
  deleteRequests: 0,
  totalLatency: 0,
}

// returns cpu usage percentage
function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length
  return cpuUsage.toFixed(2) * 100
}

// returns cpu usage percentage
function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const memoryUsage = (usedMemory / totalMemory) * 100
  return memoryUsage.toFixed(2)
}

// builds & returns metric JSON from provided values
// TODO: validate that this works
function buildSumMetric(name, unit, value, as) {
  return {
    name: name,
    unit: unit,
    sum: {
      aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
      isMonotonic: true, // TODO: find out if this means it accumulates in grafana or if we need to do it here...
      dataPoints: [
        {
          timeUnixNano: Date.now() * 1_000_000,
          [as]: value,
        },
      ],
    },
  }
}

// builds & returns gauge type to insert into metric
function buildGaugeMetric(name, unit, value) {
  return {
    name: name, // string
    unit: unit, // string
    gauge: {
      dataPoints: [
        {
          timeUnixNano: Date.now() * 1_000_000,
          asInt: Math.round(value),
        },
      ],
    }, // json object
  }
}

// adds system metrics to the buffer list of metrics
function systemMetrics(buf) {
  const cpuUsage = getCpuUsagePercentage()
  const memoryUsage = getMemoryUsagePercentage()

  cpuMetric = buildGaugeMetric("cpuUsage", "%", cpuUsage)
  memoryMetric = buildGaugeMetric("memoryUsage", "%", memoryUsage)

  buf.push(cpuMetric)
  buf.push(memoryMetric)
}

// adds the httpMetrics to the buffer list of metrics
// TODO: implement for latency??????????
function httpMetrics(buf) {
  const requestTypes = [
    { name: "total", count: globals.totalRequests },
    { name: "get", count: globals.getRequests },
    { name: "put", count: globals.putRequests },
    { name: "post", count: globals.postRequests },
    { name: "delete", count: globals.deleteRequests },
  ]

  requestTypes.forEach(({ name, count }) => {
    const metric = buildSumMetric(`requests.${name}`, "1", count, "asInt")
    buf.push(metric)
  })
}

// adds user metrics to the buffer list of metrics
// TODO: implement
function userMetrics(buf) {}

// adds user metrics to the buffer list of metrics
// TODO: implement
function purchaseMetrics(buf) {}

// adds auth metrics to the buffer list of metrics
// TODO: implement
function authMetrics(buf) {}

// handles all the request information and updates globals
// TODO: make sure this is correct, add all other metrics
function requestMetricMiddleware(req, res, next) {
  const start = Date.now()
  globals.totalRequests += 1

  switch (req.method) {
    case "GET":
      globals.getRequests += 1
      break
    case "PUT":
      globals.putRequests += 1
      break
    case "POST":
      globals.postRequests += 1
      break
    case "DELETE":
      globals.deleteRequests += 1
      break
  }

  res.on("finish", async () => {
    const duration = Date.now() - start

    globals.totalLatency += duration
  })

  next()
}

// send metrics in metricsBuffer to grafana
function sendMetricsToGrafana(metricsBuffer) {
  const allMetricsJSON = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: metricsBuffer,
          },
        ],
      },
    ],
  }

  const allMetricsBody = JSON.stringify(allMetricsJSON)
//   console.log(allMetricsBody)

  fetch(`${config.metrics.url}`, {
    method: "POST",
    body: allMetricsBody,
    headers: {
      Authorization: `Bearer ${config.metrics.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      const text = await res.text()
      if (!res.ok) {
        console.error(`Failed to push metrics: ${text}`)
        console.log(allMetricsBody)
      } else {
        console.log(`Pushed metrics`)
      }
    })
    .catch((err) => {
      console.error(`Error pushing metrics:`, err)
      console.log(allMetricsBody)
    })
}

// SEND METRICS PERIODICALLY (4s right now?)
// TODO: implement
setInterval(() => {
  // build metrics buffer
  const buf = []
  httpMetrics(buf)
  systemMetrics(buf)
  //   userMetrics(buf)
  //   purchaseMetrics(buf)
  //   authMetrics(buf)

  // send metrics in buffer to grafana
  sendMetricsToGrafana(buf)
}, 4 * 1000) // Send every 4 seconds

module.exports = {
  requestMetricMiddleware,
}
