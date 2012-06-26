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
      {logger:{simpleLog:{}}},
      {router:{simpleRoute:{routes:[
        {api: {api:{rest:{
          endPoints: __dirname+'/../../lib/endPoints'
      }}}},
      ]}}},
      {static:{paper:{
              publicFolder: "web"
      }}},
      {backDoor:{}}
  ],
  dataSources: {
    testMongo: {
      mongodb: {
        server: 'localhost',
        db: 'test-house'
      }
    },
    testMemcache: {
      memcache: {
        server: 'localhost'
      }
    },
    fileSystem: {
      fs: {
        path: __dirname+'/../../'
      }
    }
  }
}
