exports = module.exports.config = {
  env: "test",
  version: 0.001,
  webPort: 8888,
  webPortSecure: 8443,
  filters: [
      {parser:{}},
      {session:{houseGuest:{
              guestName: "Anonymous Tester"
      }}},
      {router:{simpleRoute:{routes:[
              {api: {api:{rest:{}}}},
      ]}}},
      {static:{paper:{
              publicFolder: "web"
      }}},
      {backDoor:{}}
  ]
}
