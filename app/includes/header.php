<?php
defined('ROOT') || exit;
/* print the top of the HTML page (head tag, styles, fonts) */
function page_head($t)
{
    global $me;
    echo '<!doctype html><html lang=en data-theme="' . esc($me['a_theme'] ?? 'light') . '"' . ($me ? ' data-user' : '') . (!empty($me['a_calm']) ? ' data-calm' : '') . '><head><meta charset=utf-8><script>(function(){var h=document.documentElement,t=h.getAttribute("data-theme");try{if(h.hasAttribute("data-user"))localStorage.setItem("unsent-theme",t);else t=localStorage.getItem("unsent-theme")||t}catch(e){}h.setAttribute("data-theme",t);if(t=="auto")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";h.setAttribute("data-eff",t||"light");try{if(!sessionStorage.getItem("fx-seen")){h.classList.add("fx-first");sessionStorage.setItem("fx-seen",1)}}catch(e){}})();try{if(/[?&]onb=1/.test(location.search)||(matchMedia("(max-width:900px)").matches&&!localStorage.getItem("unsent-onb")))h.classList.add("onb")}catch(e){}addEventListener("pagereveal",function(e){if(e.viewTransition&&document.documentElement.hasAttribute("data-calm"))e.viewTransition.skipTransition()})</script><script>try{if((matchMedia("(display-mode:standalone)").matches||navigator.standalone||matchMedia("(max-width:900px)").matches)&&!sessionStorage.getItem("unsent-splash"))document.documentElement.classList.add("spl")}catch(e){}</script><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content"><meta name=theme-color content="#fcf7f4"><link rel=manifest href="manifest.webmanifest" crossorigin="use-credentials"><link rel="apple-touch-icon" href="img/icons/icon-180.png"><meta name=apple-mobile-web-app-title content=Unsent><meta name=mobile-web-app-capable content=yes><meta name=apple-mobile-web-app-capable content=yes><meta name=apple-mobile-web-app-status-bar-style content=default><meta name=format-detection content="telephone=no"><meta name=csrf content="' . esc($GLOBALS['CSRF']) . '"><link rel=preconnect href="https://fonts.googleapis.com"><link rel=preconnect href="https://fonts.gstatic.com" crossorigin><title>' . $t . ' · Unsent</title><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Dancing+Script:wght@500;700&family=Kalam:wght@400;700&family=Lora:wght@500;700&family=Special+Elite&family=Manrope:wght@400;500;600;700&display=swap" rel=stylesheet><link rel=stylesheet href="css/style.css?v=' . filemtime(PUB . '/css/style.css') . '"><link rel=stylesheet href="css/motion.css?v=' . @filemtime(PUB . '/css/motion.css') . '"><link rel=stylesheet href="css/responsive.css?v=' . @filemtime(PUB . '/css/responsive.css') . '"><link rel=stylesheet href="css/chat.css?v=' . @filemtime(PUB . '/css/chat.css') . '"><link rel=stylesheet href="css/stickers.css?v=' . @filemtime(PUB . '/css/stickers.css') . '"><link rel=stylesheet href="css/editor.css?v=' . @filemtime(PUB . '/css/editor.css') . '"><link rel=stylesheet href="css/mobile.css?v=' . @filemtime(PUB . '/css/mobile.css') . '"><link rel=stylesheet href="css/call.css?v=' . @filemtime(PUB . '/css/call.css') . '"><link rel=stylesheet href="css/onboarding.css?v=' . @filemtime(PUB . '/css/onboarding.css') . '"><link rel=stylesheet href="css/neat.css?v=' . @filemtime(PUB . '/css/neat.css') . '"><link rel=stylesheet href="css/round4.css?v=' . @filemtime(PUB . '/css/round4.css') . '"><link rel=stylesheet href="css/phone.css?v=' . @filemtime(PUB . '/css/phone.css') . '"><link rel=stylesheet href="css/dark.css?v=' . @filemtime(PUB . '/css/dark.css') . '"><link rel=stylesheet href="css/nav.css?v=' . @filemtime(PUB . '/css/nav.css') . '"><link rel=stylesheet href="css/splash.css?v=' . @filemtime(PUB . '/css/splash.css') . '"><link rel=stylesheet href="css/fixes.css?v=' . @filemtime(PUB . '/css/fixes.css') . '"><link rel=stylesheet href="css/round5.css?v=' . @filemtime(PUB . '/css/round5.css') . '"><link rel=stylesheet href="css/chatpage.css?v=' . @filemtime(PUB . '/css/chatpage.css') . '"><link rel=stylesheet href="css/final.css?v=' . @filemtime(PUB . '/css/final.css') . '"><link rel=stylesheet href="css/space.css?v=' . @filemtime(PUB . '/css/space.css') . '"><link rel=stylesheet href="css/dockfix.css?v=' . @filemtime(PUB . '/css/dockfix.css') . '"><script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script><script defer src="js/colorwheel.js?v=' . @filemtime(PUB . '/js/colorwheel.js') . '"></script></head><body' . (!empty($me['a_calm']) ? ' class=calm' : '') . '><a class=skip href="#main">Skip to content</a>';
    splash_markup();
    onboarding_markup();
}

/* first-run welcome (phones). Hidden by CSS unless the head script adds class "onb" to <html>. See css/onboarding.css + js/onboarding.js */
function onboarding_markup()
{
    echo '<div id=onb data-i=0 role=dialog aria-modal=true aria-label="Welcome to Unsent"><div class=onb-bar aria-hidden=true><i></i></div><div class=onb-track>'
        . '<section class=onb-page><h2>Write what you can’t say.</h2><img class=onb-art src="img/onb_write.png" alt="Someone writing in a notebook" width=291 height=231><p>Put your thoughts into words, without having to send them.</p></section>'
        . '<section class=onb-page><h2>Keep it unsent.</h2><img class=onb-art src="img/onb_keep.png" alt="A letter in a bottle floating on the sea" width=306 height=229><p>Say it. Write it.<br>Some words are better left unsent.</p></section>'
        . '</div><div class=onb-foot><button type=button class=onb-skip>Skip</button><button type=button class=onb-next>Next</button></div></div>';
}

/* animated logo splash. Shown once per app launch on phones / installed app. See css/splash.css */
function splash_markup()
{
    $v = '?v=' . @filemtime(PUB . '/img/splash.mp4');
    echo '<div id=spl aria-hidden=true><video muted playsinline preload=auto src="img/splash.mp4' . $v . '"></video></div>'
        . '<script>(function(){var h=document.documentElement,s=document.getElementById("spl"),v=s&&s.querySelector("video");'
        . 'if(!s)return;if(!h.classList.contains("spl")){s.remove();return}'
        . 'try{sessionStorage.setItem("unsent-splash",1)}catch(e){}'
        . 'var done=0;function end(){if(done)return;done=1;s.classList.add("out");setTimeout(function(){s.remove();h.classList.remove("spl")},550)}'
        . 's.addEventListener("pointerdown",end);'
        . 'if(matchMedia("(prefers-reduced-motion:reduce)").matches){v.addEventListener("loadedmetadata",function(){v.currentTime=Math.max(0,v.duration-.05)});setTimeout(end,1400);return}'
        . 'v.addEventListener("ended",function(){setTimeout(end,500)});'
        . 'v.addEventListener("error",function(){setTimeout(end,900)});'
        . 'var p=v.play();if(p&&p.catch)p.catch(function(){setTimeout(end,900)});'
        . 'setTimeout(function(){if(!v.currentTime)end()},3500);setTimeout(end,7000)})()</script>';
}
