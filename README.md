![Screenshot of the first committed version of Cloudfall](https://github.com/antimatter15/cloudfall/raw/master/screenshot.png)

## Sorry

I don't seem to have an actual readme for this, so in lieu of something which may be moderately useful on a github description and summary page, I'll copy and paste the little blurb which is displayed when a user opens Cloudfall for the first time.

## That thing that I copied from the intro

Welcome to CloudFall. Yeah, I'm aware how dumb it sounds, but the fact that the new James Bond movie is going to be called Skyfall essentially demolishes any hope of using that name. But rather than using this as a vindication of how cool that name would be and abandoning it for some novel name, I'm just going to contrive something in a similar vain, hence the current working name. But rather than spending the first few lines complaining about the name of the product, I should probably lay down what exactly this project aims to be. It's a text editor, not a terribly glamorous concept, I know, and this is especially not a terribly great time to start. This is hardly the first text editor, and certainly will not be the last (until this either never finishes or the world actually does end by the end of this year). It's not the most full featured or anything else. So why does it exist?

Because I love what SourceKit could have become. SourceKit was this awesome chrome app which saved files on Dropbox and that was just something so astonishingly useful. But there were a few features that I always wanted but never quite got, but I never actually used SourceKit much. A few months ago I started using a new desktop text editor which was cross platform and worked well on Windows, Mac and Linux, and I for the first time thought I knew exactly I wanted out of a text editor. My main laptop (note, not main computer) is a Chromebook (specifically the Samsung Series 5, the first one). Despite the fact it's the model with the 3G modem, I've always wanted whatever text editor I used to work offline.

This is basically the Ace text editing component from Cloud9 IDE with some Dropbox syncing guts ripped out of SourceKit with some custom CSS and JS to save to the local file system. It's fairly minimalistic, probably less so than SourceKit but much simpler and lighter than the behemoth which is Cloud9.

There are two main non-obvious interfaces to this application. The obvious one is of course the giant blank text input space which you should see this text inside. Feel free to edit this and insert whatever notes you may find useful, or indulge your pedantic grammar nazi tendencies by snarkily substituting my linguistic malapropisms. 

The first, and probably most imminently useful, is the file selector. That can be accessed by typing Ctrl-O, which you might have been able to discover without this message. But rather than opening files from your native file system (which Chrome packaged apps version 1 can't do), you get this sandboxed file system which should, if this is your first use, have one file. This one.

But one of the main features is that it syncs with Dropbox, and in order to enable dropbox sync, you first need to discover the second (and even more non-obvious) interface to this app. That's the command palette, which can be accessed using Ctrl-P. There, you can find commands and stuff for changing themes, syntax (though this should be detected automatically when a file is loaded), other editor settings and stuff. 

But for dropbox sync, you need to first run the command named "Authorize Dropbox". Then it'll create a new window and get you through the OAuth workflow. Since this app works offline and all the code runs locally, you don't have to worry about exposing the contents of your Dropbox to nefarious third parties (read: me). Once you've returned, you need to set "Browse Mode: Remote Dropbox", so that the Ctrl-O file selector will display stuff from Dropbox rather than the local cache.

This is a file which will be saved to /CloudFall-Introduction.txt, feel free to write and take notes about how you use CloudFall here.

Have fun. Or at least, I sure hope your experience with this isn't too miserable.

## Why you should use this?

I don't know.