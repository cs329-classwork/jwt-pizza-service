function generateMenuItem() {
  return {
    title: generateRandomWord(5),
    description: generateRandomWord(5),
    image: generateRandomWord(5),
    price: Math.random() * 100 ,
  }
}

function generateFranchise(userEmailList) {
  const franchise = {}
  const wordLength = 5

  franchise.name = generateRandomWord(wordLength)
  franchise.admins = userEmailList

  return franchise
}

function generateUser() {
  let user = {}
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

module.exports = {
  generateRandomWord,
  generateUser,
  generateFranchise,
  generateMenuItem,
}
