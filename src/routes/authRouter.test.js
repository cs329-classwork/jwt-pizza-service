/* eslint-disable no-undef */
const supertest = require("supertest")
const app = require("../service")

test("test create user (happy)", async () => {
  const user = { name: "pizza diner", email: "d@jwt.com", password: "diner" }
  const response = await supertest(app).post("/api/auth").send(user)

  // check response status
  expect(response.status).toBe(200)

  // check header
  expect(response.headers["content-type"]).toBe(
    "application/json; charset=utf-8"
  )

  // validate response
  expect(response.body).toHaveProperty("user")
  expect(response.body.user).toMatchObject({
    name: user.name,
    email: user.email,
    roles: expect.arrayContaining([{ role: "diner" }]),
    id: expect.any(Number),
  })

  // validate token
  expect(response.body).toHaveProperty("token")
  expect(typeof response.body.token).toBe("string")
  expect(response.body.token.length).toBeGreaterThan(0)
})

test("test create user (sad)", async () => {
  const user = {}
  const response = await supertest(app).post("/api/auth").send(user)

  // check response status
  expect(response.status).toBe(400)

  // check header
  expect(response.headers["content-type"]).toBe(
    "application/json; charset=utf-8"
  )

  // validate response
  expect(response.body.message).toBe("name, email, and password are required")
})
