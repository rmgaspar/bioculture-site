
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" role="img" aria-label="Videira recortada em ícone editorial">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F1E6"/>
      <stop offset="100%" stop-color="#EFE7D7"/>
    </linearGradient>

    <linearGradient id="soilDark" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#8B4636"/>
      <stop offset="100%" stop-color="#5E2D22"/>
    </linearGradient>

    <linearGradient id="soilMid" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#C88E5E"/>
      <stop offset="100%" stop-color="#A55E3D"/>
    </linearGradient>

    <linearGradient id="trunk" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#2B2014"/>
      <stop offset="100%" stop-color="#5E4B30"/>
    </linearGradient>

    <linearGradient id="leafA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A8944B"/>
      <stop offset="100%" stop-color="#7D6B37"/>
    </linearGradient>

    <linearGradient id="leafB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C0C8A6"/>
      <stop offset="100%" stop-color="#99A579"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1024" rx="52" fill="#F7F4ED"/>

  <!-- outer circle -->
  <circle cx="512" cy="512" r="445" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="402" fill="none" stroke="#FFFFFF" stroke-width="12" opacity="0.95"/>

  <!-- soft distant hills -->
  <path d="M160 380C300 292 460 252 620 266C767 279 867 331 928 296V540H160V380Z" fill="#E7DDC6" opacity="0.95"/>
  <path d="M128 524C292 446 444 422 610 434C756 444 839 482 912 451V588H128V524Z" fill="#DDD1B3" opacity="0.64"/>
  <path d="M190 611C336 561 482 546 620 555C746 563 836 588 920 572V684H190V611Z" fill="#D5C3A2" opacity="0.42"/>

  <!-- sun -->
  <circle cx="736" cy="330" r="34" fill="#EFB765"/>

  <!-- vine trunk -->
  <path d="M360 795C360 710 375 638 404 576C425 531 439 479 447 423" stroke="url(#trunk)" stroke-width="24" stroke-linecap="round"/>
  <path d="M438 452C418 431 404 405 397 376" stroke="url(#trunk)" stroke-width="16" stroke-linecap="round"/>
  <path d="M460 418C486 404 506 386 525 363" stroke="url(#trunk)" stroke-width="16" stroke-linecap="round"/>
  <path d="M446 370C438 338 438 308 445 279" stroke="url(#trunk)" stroke-width="12" stroke-linecap="round"/>

  <!-- tendrils -->
  <path d="M548 270C566 262 580 266 585 277C591 290 583 301 570 302C557 302 548 293 550 282C552 268 568 258 588 255" stroke="url(#trunk)" stroke-width="8" stroke-linecap="round"/>
  <path d="M554 377C572 369 585 373 590 383C596 395 588 406 576 407C563 408 554 400 556 389C558 376 573 366 591 363" stroke="url(#trunk)" stroke-width="8" stroke-linecap="round"/>
  <path d="M515 183C531 178 543 182 548 191C553 200 549 210 539 213C527 217 519 209 519 199C519 187 530 178 546 174" stroke="url(#trunk)" stroke-width="7" stroke-linecap="round"/>

  <!-- leaves -->
  <path d="M270 292C220 284 184 255 168 214C210 181 265 178 310 210C320 241 307 273 270 292Z" fill="url(#leafA)"/>
  <path d="M364 251C348 205 356 164 388 134C434 156 462 199 456 247C430 271 396 275 364 251Z" fill="url(#leafA)"/>
  <path d="M496 239C490 193 506 159 540 139C583 160 600 204 588 246C563 264 528 263 496 239Z" fill="url(#leafA)"/>
  <path d="M690 385C682 353 690 330 714 314C748 322 767 344 773 376C756 395 729 401 690 385Z" fill="url(#leafB)"/>

  <!-- leaf veins -->
  <g stroke="#EFE6CF" stroke-width="3" stroke-linecap="round" opacity="0.8">
    <path d="M270 290L285 242"/>
    <path d="M270 290L306 260"/>
    <path d="M270 290L240 251"/>
    <path d="M364 248L396 187"/>
    <path d="M364 248L421 224"/>
    <path d="M364 248L387 293"/>
    <path d="M496 238L528 184"/>
    <path d="M496 238L556 220"/>
    <path d="M496 238L519 286"/>
    <path d="M690 385L720 343"/>
    <path d="M690 385L742 366"/>
  </g>

  <!-- grapes -->
  <g>
    <circle cx="539" cy="552" r="34" fill="#8B1F43"/>
    <circle cx="583" cy="570" r="34" fill="#A02B4A"/>
    <circle cx="562" cy="615" r="34" fill="#701936"/>
    <circle cx="614" cy="605" r="34" fill="#8F2746"/>
    <circle cx="517" cy="599" r="34" fill="#A92F50"/>
    <circle cx="561" cy="660" r="34" fill="#7C1D39"/>
    <circle cx="633" cy="646" r="34" fill="#9A2A48"/>
    <path d="M540 552C532 530 529 511 530 494" stroke="#6C583B" stroke-width="7" stroke-linecap="round"/>
    <path d="M583 570C593 547 599 523 600 500" stroke="#6C583B" stroke-width="7" stroke-linecap="round"/>
    <path d="M614 605C621 582 624 560 623 538" stroke="#6C583B" stroke-width="7" stroke-linecap="round"/>
  </g>

  <!-- branching roots -->
  <path d="M360 795C324 820 300 849 286 885" stroke="url(#soilMid)" stroke-width="14" stroke-linecap="round"/>
  <path d="M358 795C368 830 379 860 397 896" stroke="url(#soilMid)" stroke-width="10" stroke-linecap="round"/>
  <path d="M365 788C393 809 420 837 442 871" stroke="url(#soilMid)" stroke-width="10" stroke-linecap="round"/>
  <path d="M356 790C338 775 321 756 308 733" stroke="url(#soilMid)" stroke-width="10" stroke-linecap="round"/>

  <!-- soil cutaway -->
  <path d="M132 820C255 798 372 790 512 792C634 794 748 805 892 790V949H132V820Z" fill="url(#soilDark)"/>
  <path d="M132 794C256 775 378 767 512 768C633 769 752 781 892 768V828C746 841 638 833 512 833C376 833 262 839 132 859V794Z" fill="url(#soilMid)" opacity="0.92"/>

  <!-- soil stones -->
  <g opacity="0.42">
    <circle cx="210" cy="883" r="10" fill="#F2D7BD"/>
    <circle cx="256" cy="900" r="13" fill="#F6E6D4"/>
    <circle cx="304" cy="880" r="8" fill="#E9BF97"/>
    <circle cx="365" cy="907" r="11" fill="#F5E7D4"/>
    <circle cx="430" cy="889" r="9" fill="#E8C39B"/>
    <circle cx="496" cy="913" r="14" fill="#F5E8D8"/>
    <circle cx="574" cy="883" r="9" fill="#E7BE95"/>
    <circle cx="646" cy="902" r="12" fill="#F2DFC8"/>
    <circle cx="720" cy="885" r="8" fill="#E9C19A"/>
    <circle cx="790" cy="910" r="11" fill="#F5E7D6"/>
  </g>

  <!-- root threads -->
  <g stroke="#F5E3CD" stroke-width="3" stroke-linecap="round" opacity="0.45">
    <path d="M175 915C215 900 245 900 277 912"/>
    <path d="M286 930C323 918 355 918 388 931"/>
    <path d="M413 912C453 898 492 898 528 912"/>
    <path d="M556 930C595 916 637 916 670 930"/>
    <path d="M694 912C735 900 774 900 813 914"/>
  </g>
</svg>`;

      document.getElementById("preview").src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      document.getElementById("code").value = svg;
    