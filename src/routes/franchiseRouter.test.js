const supertest = require("supertest")
const app = require("../service")
const { DB, Role } = require("../database/database")
const {
  generateFranchise,
  generateUser,
  generateRandomWord,
} = require("../testUtils")

describe("franchise router tests:", () => {
  describe("list franchises", () => {
    test("happy", async () => {
      jest.setTimeout(60 * 1000 * 5)
      //   create franchise
      const franchise = generateFranchise([])
      await DB.createFranchise(franchise)

      // list franchise
      const response = await supertest(app).get("/api/franchise").expect(200)

      expect(
        response.body.filter((e) => e.name === franchise.name).length
      ).toBeGreaterThan(0)
    })
  })

  describe("list user's franchises", () => {
    test("happy", async () => {})
  })

  describe("delete franchise", () => {
    test("happy", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([])
      const franchiseResponse = await DB.createFranchise(franchise)

      await supertest(app)
        .delete(`/api/franchise/${franchiseResponse.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
    })

    test("sad: not authorized", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Diner }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([])
      const franchiseResponse = await DB.createFranchise(franchise)

      await supertest(app)
        .delete(`/api/franchise/${franchiseResponse.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })
  })

  describe("create franchise:", () => {
    test("happy", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(200)
    })

    test("sad: not authorized", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Diner }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(403)
    })
  })

  describe("create store:", () => {
    test("happy", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      const franchiseResponse = await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(200)

      const store = { name: generateRandomWord() }
      await supertest(app)
        .post(`/api/franchise/${franchiseResponse.body.id}/store`)
        .set("Authorization", `Bearer ${token}`)
        .send(store)
        .expect(200)
    })

    test("sad: not authorized", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      const franchiseResponse = await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(200)

      const newUser = generateUser()
      newUser.roles = [{ role: Role.Diner }]
      await DB.addUser(newUser)

      const loginResponse2 = await supertest(app)
        .put("/api/auth")
        .send({ email: newUser.email, password: newUser.password })
      const token2 = loginResponse2.body.token

      const store = { name: generateRandomWord() }
      await supertest(app)
        .post(`/api/franchise/${franchiseResponse.body.id}/store`)
        .set("Authorization", `Bearer ${token2}`)
        .send(store)
        .expect(403)
    })
  })

  describe("delete store:", () => {
    test("happy", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      const franchiseResponse = await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(200)

      const store = { name: generateRandomWord() }
      const storeResponse = await supertest(app)
        .post(`/api/franchise/${franchiseResponse.body.id}/store`)
        .set("Authorization", `Bearer ${token}`)
        .send(store)
        .expect(200)

      await supertest(app)
        .delete(
          `/api/franchise/${franchiseResponse.body.id}/store/${storeResponse.id}`
        )
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
    })

    test("sad", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      expect(await DB.isLoggedIn(token)).toBe(true)

      const franchise = generateFranchise([{ email: user.email }])

      const franchiseResponse = await supertest(app)
        .post("/api/franchise")
        .set("Authorization", `Bearer ${token}`)
        .send(franchise)
        .expect(200)

      const store = { name: generateRandomWord() }
      const storeResponse = await supertest(app)
        .post(`/api/franchise/${franchiseResponse.body.id}/store`)
        .set("Authorization", `Bearer ${token}`)
        .send(store)
        .expect(200)

      const newUser = generateUser()
      newUser.roles = [{ role: Role.Diner }]
      await DB.addUser(newUser)

      const loginResponse2 = await supertest(app)
        .put("/api/auth")
        .send({ email: newUser.email, password: newUser.password })
      const token2 = loginResponse2.body.token

      await supertest(app)
        .delete(
          `/api/franchise/${franchiseResponse.body.id}/store/${storeResponse.id}`
        )
        .set("Authorization", `Bearer ${token2}`)
        .expect(403)
    })
  })
})
