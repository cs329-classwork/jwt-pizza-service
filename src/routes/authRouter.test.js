const supertest = require("supertest")
const app = require("../service")
const { DB } = require("../database/database")

describe("auth router tests:", () => {
  describe("create user", () => {
    test("happy: user created", async () => {
      const user = generateUser()
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

    test("sad: doesn't create user", async () => {
      const emptyUser = {}
      const response = await supertest(app).post("/api/auth").send(emptyUser)

      // check response status
      expect(response.status).toBe(400)

      // check header
      expect(response.headers["content-type"]).toBe(
        "application/json; charset=utf-8"
      )

      // validate response
      expect(response.body.message).toBe(
        "name, email, and password are required"
      )
    })
  })

  describe("login user", () => {
    test("happy: correct login", async () => {
      // insert test user into database
      const user = generateUser()
      user.roles = [{ role: "diner" }]
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

    test("sad: user doesn't exist", async () => {
      const fakeUser = generateUser()
      const response = await supertest(app).put("/api/auth").send(fakeUser)

      expect(response.status).toBe(404)
    })

    test("sad: incorrect password", async () => {
      const user = generateUser()
      user.roles = [{ role: "diner" }]
      await DB.addUser(user)

      // send call to service
      const badUserInfo = { email: "d2@jwt.com", password: "badPassword" }
      const response = await supertest(app).put("/api/auth").send(badUserInfo)

      expect(response.status).toBe(404)
      expect(response.body.message).toBe("unknown user")
    })
  })

  describe("logout user", () => {
    test("happy: user logged out", async () => {
      // login user and save token
      const user = generateUser()
      user.roles = [{ role: "diner" }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      // check if logged in via db.isLoggedIn()
      expect(await DB.isLoggedIn(token)).toBe(true)

      // logout user
      const response = await supertest(app)
        .delete("/api/auth")
        .set("Authorization", `Bearer ${token}`)

      // check if logged in (assert logged out)
      expect(await DB.isLoggedIn(token)).toBe(false)
    })
  })

  describe("update user", () => {
    test("happy: user updated", async () => {
      // generate user and save token
      const user = generateUser()
      user.roles = [{ role: "admin" }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      const newEmail = generateRandomWord(20)
      const newPassword = generateRandomWord(20)
      const updateResponse = await supertest(app)
        .put(`/api/auth/${loginResponse.body.user.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ email: newEmail, password: newPassword })
        .expect(200)
    })

    test("sad: user unauthorized to change other user", async () => {
      // generate user and save token
      const user = generateUser()
      user.roles = [{ role: "diner" }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      const newEmail = generateRandomWord(20)
      const newPassword = generateRandomWord(20)
      const updateResponse = await supertest(app)
        .put(`/api/auth/${loginResponse.body.user.id - 1}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ email: newEmail, password: newPassword })
      
      expect(updateResponse.body.message).toBe("unauthorized")
      expect(updateResponse.status).toBe(403)
    })
  })
})

function generateUser() {
  const user = {}
  const wordLength = 5

  user.name = generateRandomWord(wordLength)
  user.email =
    generateRandomWord(wordLength) +
    "@" +
    generateRandomWord(wordLength) +
    ".com"
  user.password = generateRandomWord(wordLength)

  return user
}

function generateRandomWord(length) {
  const letters = "abcdefghijklmnopqrstuvwxyz"
  let word = ""
  for (let i = 0; i < length; i++) {
    word += letters.charAt(Math.floor(Math.random() * letters.length))
  }
  return word
}
