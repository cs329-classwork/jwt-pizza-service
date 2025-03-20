const os = require("os")
const config = require("./config")

// globals
const globals = {
  totalRequests: 0,
  getRequests: 0,
  putRequests: 0,
  postRequests: 0,
  deleteRequests: 0,
  lastRequestLatency: 0,
  totalLoginAttempts: 0,
  successfulLoginAttempts: 0,
  failedLoginAttempts: 0,
  activeUsers: 0,
  revenue: 0,
  successfulPizzasSold: 0,
  unsuccessfulPizzasSold: 0,
  lastPizzaLatency: 0,
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
function buildSumMetric(name, unit, value, as) {
  return {
    name: name,
    unit: unit,
    sum: {
      aggregationTemporality: "AGGREGATION_TEMPORALITY_CUMULATIVE",
      isMonotonic: true, // expects value to ONLY either RESET or ACCUMULATE
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
function buildGaugeMetric(name, unit, value, as = "asInt", round = true) {
  return {
    name: name, // string
    unit: unit, // string
    gauge: {
      dataPoints: [
        {
          timeUnixNano: Date.now() * 1_000_000,
          [as]: (round) ? Math.round(value) : value,
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
function httpMetrics(buf) {
  const requestTypes = [
    { name: "total", count: globals.totalRequests },
    { name: "get", count: globals.getRequests },
    { name: "put", count: globals.putRequests },
    { name: "post", count: globals.postRequests },
    { name: "delete", count: globals.deleteRequests },
  ]

  // add all http request counts to buffer
  requestTypes.forEach(({ name, count }) => {
    const metric = buildSumMetric(`requests.${name}`, "1", count, "asInt")
    buf.push(metric)
  })

  // add latency of last request to buffer
  buf.push(
    buildGaugeMetric(`requests.latency`, "ms", globals.lastRequestLatency)
  )
}

// adds user metrics to the buffer list of metrics
function userMetrics(buf) {
  buf.push(buildGaugeMetric("user.count", "1", globals.activeUsers))
}

// adds user metrics to the buffer list of metrics
function purchaseMetrics(buf) {
  const purchases = [
    { name: "success", count: globals.successfulPizzasSold },
    { name: "fail", count: globals.unsuccessfulPizzasSold },
  ]

  purchases.forEach((p) => {
    buf.push(buildSumMetric(`purchase.${p.name}`, "1", p.count, "asInt"))
  })

  buf.push(buildGaugeMetric(`purchase.revenue`, "1", globals.revenue, "asDouble", false))
  buf.push(buildGaugeMetric("pizza.latency", "ms", globals.lastPizzaLatency))
}

// adds auth metrics to the buffer list of metrics
function authMetrics(buf) {
  const metricList = [
    { name: "login_attempts", count: globals.totalLoginAttempts },
    { name: "login_success", count: globals.successfulLoginAttempts },
    { name: "login_failure", count: globals.failedLoginAttempts },
  ]

  metricList.forEach(({ name, count }) => {
    const metric = buildSumMetric(`auth.${name}`, "1", count, "asInt")
    buf.push(metric)
  })
}

// handles all the request information and updates globals
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
    globals.lastRequestLatency = duration

    if (req.originalUrl === "/api/auth") {
      // Auth block
      globals.totalLoginAttempts += 1
      if (req.method === "PUT") {
        if (res.statusCode === 200) {
          globals.successfulLoginAttempts += 1
          globals.activeUsers += 1
        } else {
          globals.failedLoginAttempts += 1
        }
      }

      if (req.method === "POST" && res.ok) {
        // increment user count on registration
        globals.activeUsers += 1
      }

      if (req.method === "DELETE") {
        globals.activeUsers = Math.max(globals.activeUsers - 1, 0)
      }
    }

    // if (req.path === "/api/order" && req.method === "POST") {
    if (req.originalUrl === "/api/order") {
      // get number of pizzas from request
      const numPizzas = req.body.items.reduce((n, _) => n + 1, 0)
      // get total revenue of request
      const revenue = req.body.items.reduce((n, curr) => n + curr.price, 0)

      globals.lastPizzaLatency = duration
      if (res.statusCode >= 200 && res.statusCode < 300) {
        globals.successfulPizzasSold += numPizzas
        globals.revenue += revenue
      } else {
        globals.unsuccessfulPizzasSold += numPizzas
      }
    }
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
setInterval(() => {
  // build metrics buffer
  const buf = []
  httpMetrics(buf)
  systemMetrics(buf)
  authMetrics(buf)
  userMetrics(buf)
  purchaseMetrics(buf)

  // send metrics in buffer to grafana
  sendMetricsToGrafana(buf)
}, 5 * 1000) // Send every 4 seconds

module.exports = {
  requestMetricMiddleware,
}
