
      const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none" role="img" aria-label="Videira minimalista">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.34" r="0.85">
      <stop offset="0%" stop-color="#F7F1E6"/>
      <stop offset="100%" stop-color="#EFE5D5"/>
    </radialGradient>
    <linearGradient id="soil" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#5D1F27"/>
      <stop offset="45%" stop-color="#7E3D29"/>
      <stop offset="100%" stop-color="#C9986D"/>
    </linearGradient>
    <linearGradient id="vine" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#2B2014"/>
      <stop offset="100%" stop-color="#6B5637"/>
    </linearGradient>
    <linearGradient id="leafA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A28E4A"/>
      <stop offset="100%" stop-color="#7F6C38"/>
    </linearGradient>
    <linearGradient id="leafB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C1C8A6"/>
      <stop offset="100%" stop-color="#9BA67A"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="256" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="230" fill="none" stroke="#FFFFFF" stroke-width="7"/>

  <!-- sky / hills -->
  <path d="M84 223C137 184 194 167 252 171C321 176 374 204 448 182V315H84V223Z" fill="#E8DFC9" opacity=".96"/>
  <path d="M70 279C127 245 186 234 252 238C325 243 379 270 451 244V322H70V279Z" fill="#DCCFB3" opacity=".64"/>
  <ellipse cx="342" cy="147" rx="19" ry="19" fill="#F0B56B" opacity=".95"/>

  <!-- vine -->
  <path d="M171 318C177 274 190 240 214 209C227 194 237 170 239 143" stroke="url(#vine)" stroke-width="9" stroke-linecap="round"/>
  <path d="M211 212C196 196 184 179 178 160" stroke="url(#vine)" stroke-width="7" stroke-linecap="round"/>
  <path d="M222 196C238 185 253 171 265 154" stroke="url(#vine)" stroke-width="7" stroke-linecap="round"/>
  <path d="M236 166C232 153 232 140 236 125" stroke="url(#vine)" stroke-width="5.5" stroke-linecap="round"/>

  <!-- curls -->
  <path d="M292 88C302 84 311 87 314 95C317 104 310 111 302 111C294 111 288 105 289 98C290 88 301 79 315 77" stroke="url(#vine)" stroke-width="4" stroke-linecap="round"/>
  <path d="M285 136C293 133 300 136 303 143C306 151 301 158 294 158C286 158 281 152 282 145C283 137 291 130 304 128" stroke="url(#vine)" stroke-width="3.8" stroke-linecap="round"/>

  <!-- leaves -->
  <path d="M166 184C139 170 123 149 121 126C145 116 171 123 188 143C194 157 190 174 166 184Z" fill="url(#leafA)"/>
  <path d="M193 167C181 139 190 113 212 96C235 109 245 136 235 161C222 172 208 174 193 167Z" fill="url(#leafA)"/>
  <path d="M227 167C226 139 241 118 266 109C285 126 289 154 274 174C256 179 239 176 227 167Z" fill="url(#leafA)"/>
  <path d="M357 194C347 181 346 166 354 153C370 153 382 162 388 176C386 186 377 194 357 194Z" fill="url(#leafB)" opacity=".92"/>

  <!-- leaf veins -->
  <g stroke="#E7DFC5" stroke-width="1.6" stroke-linecap="round" opacity=".75">
    <path d="M166 184L176 169"/>
    <path d="M166 184L174 180"/>
    <path d="M166 184L160 170"/>
    <path d="M193 167L205 154"/>
    <path d="M193 167L198 159"/>
    <path d="M193 167L189 153"/>
    <path d="M227 167L241 154"/>
    <path d="M227 167L237 162"/>
    <path d="M227 167L226 154"/>
    <path d="M357 194L369 181"/>
    <path d="M357 194L365 187"/>
    <path d="M357 194L356 181"/>
  </g>

  <!-- fruit -->
  <circle cx="286" cy="252" r="16" fill="#7F1735"/>
  <circle cx="307" cy="264" r="16" fill="#922848"/>
  <circle cx="295" cy="286" r="16" fill="#6F1832"/>
  <circle cx="271" cy="276" r="16" fill="#A12C4B"/>
  <circle cx="316" cy="287" r="16" fill="#7D1C39"/>
  <circle cx="286" cy="308" r="16" fill="#8E2846"/>
  <circle cx="260" cy="296" r="16" fill="#6E1832"/>
  <path d="M286 252C281 240 276 228 275 216" stroke="#66543A" stroke-width="4" stroke-linecap="round"/>
  <path d="M307 264C315 253 319 241 321 229" stroke="#66543A" stroke-width="4" stroke-linecap="round"/>

  <!-- soil -->
  <path d="M62 338C104 329 136 330 168 336C202 343 230 341 258 333C294 323 327 321 360 329C392 336 423 339 450 333V494H62V338Z" fill="url(#soil)"/>
  <path d="M62 371C106 362 142 363 174 371C209 380 246 378 281 369C316 359 351 357 385 365C409 370 430 372 450 369V494H62V371Z" fill="#8A5139" opacity=".68"/>

  <!-- roots -->
  <path d="M171 318C149 332 132 348 123 367" stroke="url(#soil)" stroke-width="7" stroke-linecap="round"/>
  <path d="M173 318C171 339 164 355 151 372" stroke="url(#soil)" stroke-width="5" stroke-linecap="round"/>
  <path d="M174 318C190 333 203 349 212 369" stroke="url(#soil)" stroke-width="5" stroke-linecap="round"/>
  <path d="M174 318C194 325 209 337 221 352" stroke="url(#soil)" stroke-width="4.5" stroke-linecap="round"/>

  <!-- stones -->
  <g opacity=".45">
    <circle cx="106" cy="388" r="5" fill="#F0D8BE"/>
    <circle cx="132" cy="399" r="7" fill="#F5E7D5"/>
    <circle cx="159" cy="385" r="4" fill="#E8BF95"/>
    <circle cx="189" cy="403" r="6" fill="#F5E6D4"/>
    <circle cx="222" cy="395" r="5" fill="#E9C39A"/>
    <circle cx="248" cy="407" r="8" fill="#F5E8D9"/>
    <circle cx="281" cy="390" r="5" fill="#E2B993"/>
    <circle cx="312" cy="400" r="7" fill="#F3DECB"/>
    <circle cx="346" cy="387" r="4" fill="#E6C09A"/>
    <circle cx="376" cy="404" r="6" fill="#F6E8D7"/>
    <circle cx="405" cy="392" r="5" fill="#E8C59D"/>
  </g>
</svg>`.trim();

      document.getElementById("svgCode").value = iconSvg;
      document.getElementById("preview1").src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg);
    