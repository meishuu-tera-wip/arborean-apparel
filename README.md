# Arborean Apparel
Apparel **NOW**

![:thonk:](https://i.imgur.com/0cnwIz8.jpg)

## Update Notes:
**woops Pushed an incorrect update, I can't currently upload a fix, so go to `bin/node_modules/arborean-apparel/www/` and edit `main.js` and remove the line that says `aes = require(./aes)` up the top.**

Recent update containing mounts contains an updated Electron version and it is recommended you re-download the FULL version. Also networking might be wrong for mounts so please let me know if you can't see other peoples mounts thanks.

## How to:
- Download the prepackaged script from the [releases tab](https://github.com/hugedong69/arborean-apparel/releases)
- Extract/paste contents of the .zip into your `/tera-proxy` directory, overwriting when asked.
- Start tera-proxy with the included ElectronStart.bat instead of TeraProxy.bat

If this doesn't work or isnt' clear, hit me up @@@@ Pentagon#0099 on discord.

### Commands:
To open the UI type `aa open` into /proxy or `!aa open` into a normal chat. There are other commands but everything is controlled through the UI and I'm probably going to delete them because I hate ease of use.

### Online:
By default Apparel will share your costume selections with other people using the module around you by connecting to an external server. If this doesn't sound like your cup of tea, simply edit index.js and change `online: true` to false.

The server is run by me for free, if you want your own special server for your guild or something, hit me up. Server software is also on this github if you don't trust me at all. This only affects the costume sharing aspect.

## Todo:
- [x] Release
- [x] Add footprints
- [x] Fix changers
- [x] Add nude option/show underwear option
- [x] Fix nametags (if they're even broken ????)
- [ ] Remove or fix emotes
- [ ] Add effect/slider saving
- [ ] Add more effects
- [ ] Make code less bad
- [ ] Add race/appearance changing
- [ ] Reduce file size
- [ ] Tidy up UI
- [ ] Add more features (Ａｅｓｔｈｅｔｉｃｓ merge)
- [ ] other stuff

## FAQ/Errors:
`TypeError: electron.BrowserWindow is not a constructor`: Proxy isn't running as electron, please make sure you have downloaded and overwritten (or made copies of) the files in the [full release](https://github.com/hugedong69/arborean-apparel/releases).

`The system cannot find the path specified.`: You don't have electron installed in tera-proxy/node_modules, refer to the above.

`Script no work` Please make sure you're using an updated version before messaging me, and have read the readme.

`Electron.exe is not compatible with this version of windows` Please download the electron prebuilt for your OS [here](https://github.com/electron/electron/releases) and extract it into tera-proxy/node_modules over the top of the existing one

## Media/Video guide
https://www.youtube.com/watch?v=i-y2D_2DUZ8
(i'll make an actual video guide "later" lmao)
