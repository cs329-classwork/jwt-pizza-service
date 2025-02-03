const supertest = require("supertest")
const app = require("../service")
const { DB } = require("../database/database")

describe("auth router tests:", () => {
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

  test("login user (happy)", async () => {
    // insert test user into database
    const user = {
      name: "pizza diner1",
      email: "d1@jwt.com",
      password: "diner1",
      roles: [{ role: "diner" }],
    }
    await DB.addUser(user)

    // send call to service
    const { email, password } = user
    const response = await supertest(app)
      .put("/api/auth")
      .send({ email, password })

    // check status
    expect(response.status).toBe(200)

    expect(response.body).toHaveProperty("user")
    expect(response.body).toHaveProperty("token")

    expect(typeof response.body.token).toBe("string")
    expect(response.body.token.length).toBeGreaterThan(0)
  })

  test("login user (sad: user doesn't exist)", async () => {
    const fakeUser = { email: "fakeemail@jwt.com", password: "fakepassword" }
    const response = await supertest(app).put("/api/auth").send(fakeUser)

    expect(response.status).toBe(404)
  })

  test("login user (sad: incorrect password)", async () => {
    const user = {
      name: "pizza diner2",
      email: "d2@jwt.com",
      password: "diner2",
      roles: [{ role: "diner" }],
    }
    await DB.addUser(user)

    // send call to service
    const badUserInfo = { email: "d2@jwt.com", password: "badPassword" }
    const response = await supertest(app).put("/api/auth").send(badUserInfo)

    expect(response.status).toBe(404)
    expect(response.body.message).toBe("unknown user")
  })
})
