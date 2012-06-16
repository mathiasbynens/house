house.js
========
A home for your website, apps & data.

Read the [annotated source](http://comster.github.com/house/docs/lib/house/house.js.html).

Clone the [github repo](https://github.com/comster/house).

Objective
---------
Be the best open source platform for modern application development.

Focus
-----
A solid foundation for anyone to build great web and mobile apps.  Spend less time on your backend and dedicate more to your frontend.

What's it used for?
-------------------
You can use it to power your blog, website, mobile app, game, or anything else you can dream up that requires an API for data and processing in the cloud.

What does it look like?
-----------------------
The tools you need to build a great application without the hassle of rebuilding infrastructure, while remaining open and restriction free.

 - *Technology* is currently node.js, mongodb & gridfs on the server, and html5 jquery, backbone style web apps.
 - *Tools* built with the tools.  Being able to edit code on the web proves it works and makes it easy to edit your apps from anywhere.
 - *API* to power your application.  The server is a thin wrapper around your database with permissions and other logic you might add.
 - *User* authentication using OAuth to connect with popular providers and offering standard username/password login.
 - *Flexible* and open source.  No limits.  There's nothing stopping you from getting the job done.
 - *Community* of existing applications and modules.  Browse and share applications built on house.js.

Goal
----
The goal of house.js is to offer a reliable platform for modern app development with the best amenities, such as a RESTful data api, real-time streams, or media storage, without getting in the way of you building great applications and communities.

What this is great for
----------------------
When you want a modern web development stack with a realtime streaming api that is reliable and accessible, and not in someone else's cloud.  Own your data and code.

Perfect for your personal site, blog, community, social network, game, mobile app, productivity or collaboration tools, and more!

Open Source App Library
-----------------------
The power of open source lets you easily find great apps for house to do nearly anything.  The best part about using your favorite applications on house.js such as music players, location & photo sharing, bookmarking, note taking, productivity tools, contacts, blogging, reading the news and more...  is that it runs on your own private cloud and you can control the experience.  You can modify your apps to suit your needs, contribute and collaborate with the community.  This way you can find best of breed applications that you know will last.

More coming soon!
-----------------
Email j@jeffpelton.com with questions, comments and concerns!

[Join the mailing list](https://groups.google.com/forum/?fromgroups#!forum/housejs).


Getting Started
===========

**Install** house.js using [npm](http://npmjs.org/)

 > sudo npm install -g house

then make a new folder for your project, for instance:

 > mkdir ilovekungfu

 > cd ilovekungfu

next initialize the project in that folder by runnning

 > house --init

which gives you a default config/config.js and web/index.html to modify.

now start the server with

 > house --start

and the files in ilovekungfu/web will be accessible from localhost:8000.  You can modify the path and port from the config.
