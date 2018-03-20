

# Arborean Apparel


![<sub>update when?</sub>](https://i.imgur.com/llIq0bx.jpg)


 [Funnel money into my dumb mouth so I work on this and other things more thanks](https://ko-fi.com/hugedong)
*** 
- [Arborean Apparel](#arborean-apparel)
    - [How to:](#how-to)
    - [Usage:](#usage)
      - [Updating:](#updating)
      - [Online:](#online)
  - [FAQ/Errors:](#faqerrors)
  - [Todo:](#todo)
  - [Update log (16/17 March):](#update-log-1617-march)PLS READ THIS
  - [Update log (15 March):](#update-log-15-march) 



***
### How to:

- Download and install [Caali's Proxy](https://discord.gg/maqBmJV)
- Download the prepackaged script from the [releases tab](https://github.com/hugedong69/arborean-apparel/releases)
- Extract/paste contents of the .zip into your `tera-proxy` directory, overwriting when asked.
- Start Tera-Proxy with the included ElectronStart.bat

If this doesn't work or isn't clear, hit me up @@@@ Pentagon#0099 on discord.

### Usage:
To open the UI type `aa open` into /proxy or `!aa open` into a normal chat. There are other commands but everything is controlled through the UI and I'm probably going to delete them because I hate ease of use.
A brief overview of how to use the module can be found [here](https://www.youtube.com/watch?v=i-y2D_2DUZ8.com) (the UI has changed a little but it's the same stuff).

#### Updating:
This mod support auto-updating via [Caali's Proxy](https://discord.gg/maqBmJV), however currently updating does not work for the file containing the images Arborean Apparel uses.

 You can update this yourself if there has been an update by downloading [this file](https://github.com/codeagon/arborean-apparel/blob/master/www/img.asar) and extracting it to `bin/node_modules/Arborean-Apparel/www`, overwriting the existing file. This can be done while the mod is running.  I also recommended updating electron frequently to ensure the best comparability.

#### Online:
By default Apparel will share your costume selections with other people using the module around you by connecting to an external server. If this doesn't sound like your cup of tea, simply edit index.js and change `online: true` to `false`.

The server is run by me for free [(gib monei plis)](https://ko-fi.com/hugedong), if you want your own special server for your guild or something, hit me up (this is also free). Server software is also on this github if you don't trust me at all and wish to run one your self. This only affects the costume sharing aspect.
****
## FAQ/Errors: 

`Crypto error, falling back to slower JS version` Update electron, either through downloading the prebuild version in releases, downloading it from [here](https://github.com/electron/electron/releases), or npm installing it (if you know how).

`The UI is invisible!!!` Try turning `transparent` to false. Some users with older operating systems may experience this bug.

`Your version of Node.JS is too old to run tera-proxy. Version 9.0.0 or newer is required.` Please read the readme and download the proxy linked above.

`Things have no icons, halp!!!!` As updates come out, new icons are added to the game and to the module itself. As such, you'll have to download the [www/img.asar](https://github.com/codeagon/arborean-apparel/blob/master/www/img.asar) portion of the mod again and extract to `bin/node_modules/Arborean-Apparel/www`

`TypeError: electron.BrowserWindow is not a constructor or cannot find module 'Electron'`: Proxy isn't running as electron, please make sure you have downloaded and overwritten (or made copies of) the files in the [full release](https://github.com/hugedong69/arborean-apparel/releases), and are running it with the supplied .bat file.

`The system cannot find the path specified.`: You don't have electron installed in tera-proxy/node_modules, refer to the above.

`Script no work` Please make sure you're using an updated version before messaging me, and have read the readme (and I mean actually have read the readme).

`Electron.exe is not compatible with this version of windows` Please download the electron prebuilt for your OS [here](https://github.com/electron/electron/releases) and extract it into `tera-proxy/node_modules/dist` over the top of the existing one.

`y dis mod so big`  - It's 46MB smaller now!! I could reduce this further by hosting the images on the server, however that would devour too much bandwidth for the both of us.
***
## Todo:
- Do hat stuff
- Remove or fix emotes
- Add effect/slider saving
- Add more effects
- Make code less bad
- Add race/appearance changing
- Reduce file size - haha jk
- Tidy up UI
- Add more features 
- other stuff
 ***
 
 ## Update log (16/17 March):
 - Made Sky searching work correctly, also fixed it not displaying the users currently selected sky
 - Changed some CSS
 - Fixed (hopefully) an error with preset creation
 - Renamed tera-proxy.bat to ElectronStart.bat and added the file required for auto-updating (woops) **please redownload if you are having issues**
 
## Update log (15 March):
- Updated costume db and added more ~~bloat~~ useful images.
- Now works for tera-crypto and I didn't even have to do anything!
- Added several new effects, these now save and apply correctly (or should). Changes don't work gud yet.
- Added sky changing, this is found under "other". Only you can see the change.
- Changed some UI stuff to be more clear, somehow made everything uglier. WTB someone else's style.
- Fixed some bugs, added some more
