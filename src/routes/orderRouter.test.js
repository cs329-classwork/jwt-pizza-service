const supertest = require("supertest")
const app = require("../service")
const { DB, Role } = require("../database/database")
const { generateUser, generateMenuItem } = require("../testUtils")

describe("order router tests:", () => {
  describe("get pizza menu", () => {
    test("happy", async () => {
      await DB.addMenuItem(generateMenuItem())
      const response = await supertest(app).get("/api/order/menu").expect(200)
      expect(response.body.length).toBeGreaterThan(0)
    })
  })

  describe("add item to menu", () => {
    test("happy", async () => {
      const user = generateUser()
      user.roles = [{ role: Role.Admin }]
      await DB.addUser(user)

      const loginResponse = await supertest(app)
        .put("/api/auth")
        .send({ email: user.email, password: user.password })
      const token = loginResponse.body.token

      const menuItem = generateMenuItem()
      const response = await supertest(app)
        .put("/api/order/menu")
        .set("Authorization", `Bearer ${token}`)
        .send(menuItem)

      console.log(response.body)
      expect(
        response.body.filter((e) => e.title === menuItem.title && e.description === menuItem.description).length
      ).toBeGreaterThan(0)
    })
  })
})
