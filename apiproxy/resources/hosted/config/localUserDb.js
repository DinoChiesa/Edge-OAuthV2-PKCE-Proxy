// localUserDb.js
// ------------------------------------------------------------------
//
// This is a mock user validation database.
//
// created: Fri Mar 25 20:01:12 2016
// last saved: <2018-November-27 11:16:48>

var userDb = {
      "dino@apigee.com" : {
        password: 'IloveAPIs',
        uuid: 'EA1BA8EB-0A83-46BE-8B05-4C2E827F25B3',
        motto: 'If this isn\'t nice, I don\'t know what is.',
        given_name: "Dino",
        family_name: "Chiesa",
        roles: ['read', 'edit', 'delete']
      },
      "valerie@example.com" : {
        password: 'Wizard123',
        uuid: '0B1A8BFF-5000-4868-817E-3C157510C1D9',
        given_name: "Valerie",
        family_name: "Smith",
        motto: 'There\'s no problem that Regular Expressions cannot exacerbate.',
        roles: ['read']
      },
      "heidi@example.com": {
        password : '1Performance',
        uuid: '11F795B4-F5FD-4A05-8B8C-BADD30098ABA',
        motto: 'This is the good part.',
        given_name: "Heidi",
        family_name: "Smith",
        roles: ['read']
      },
      "greg@example.com" : {
        password: 'Memento4Quiet',
        uuid: '12B1854A-BD79-4857-83C1-29457B3972B8',
        motto: 'Imagine it, Believe it, Make it Real.',
        given_name: "Greg",
        family_name: "Smith",
        roles : ['read', 'edit']
      },
      "naimish@example.com" : {
        password: 'Imagine4',
        uuid: '12B1854A-BD79-4857-83C1-29457B3972B8',
        motto: 'Imagine it, Believe it, Make it Real.',
        given_name: "Naimish",
        family_name: "Smith",
        roles : ['read', 'edit']
      },

      // Obviously, you can add more records here.
      //
      // Also, you can add other properties to each record. For example, beyond
      // roles, you could add 'defaultProvider' or whatever else makes sense in
      // your desired system. If you DO add other data items, then you would also
      // need to modify the Edge policy to accept those properties and store them when
      // generating the user token.
      //
    };

module.exports = userDb;
