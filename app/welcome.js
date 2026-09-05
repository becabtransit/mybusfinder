(function () {
  "use strict";

  if (window.MyBusFinderWelcome) return;

  var STYLE_ID = "mbf-welcome-styles";
  var OVERLAY_ID = "mbf-welcome-overlay";
  var TRANSITION_MS = 280;

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCXA5YC8HPnZ-Ws3kvKtngM1kCj-5C6yDY",
    authDomain: "mybusfinder-becabdev.firebaseapp.com",
    projectId: "mybusfinder-becabdev",
    storageBucket: "mybusfinder-becabdev.firebasestorage.app",
    messagingSenderId: "838241151551",
    appId: "1:838241151551:web:35836e3f314a7967df268a",
  };

  function ensureFirebase() {
    if (!window.firebase || !firebase.auth) {
      console.error(
        "[MBF] Le SDK Firebase (compat) n'est pas chargé "
      );
      return null;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    return firebase;
  }

  function getDb() {
    var fb = ensureFirebase();
    if (!fb) return null;
    if (!firebase.firestore) {
      console.error(
        "[MBF] Le SDK Firestore n'est pas chargé. " +
        "Ajoute firebase-firestore-compat.js avant ce script."
      );
      return null;
    }
    return firebase.firestore();
  }

  function saveUserProfile(uid, data) {
    var db = getDb();
    if (!db) return Promise.resolve();
    return db.collection("users").doc(uid).set(data, { merge: true });
  }

  var HEADER_ICONS = [
    // bus
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="12" rx="2"/>
        <circle cx="7" cy="17" r="1.5"/>
        <circle cx="17" cy="17" r="1.5"/>
        </svg>
        `,
    // document
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"></path>
      <path d="M14 3v5h5"></path>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="15" y2="17"></line>
    </svg>`,
    // connexion
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"></path>
    </svg>`,
    // cafe
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"></path>
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"></path>
      <path d="M8 2c0 1-1 1-1 2s1 1 1 2"></path>
      <path d="M12 2c0 1-1 1-1 2s1 1 1 2"></path>
    </svg>`,
  ];
  var HEADER_TITLES = ["Bienvenue", "Conditions d'Utilisation", "Connexion", "Soutenir le projet"];

  var CSS = `
    @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap");

    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0;
      background-color: #000000d4;
      opacity: 0;
      transition: opacity ${TRANSITION_MS}ms ease;
      font-family: "Outfit", sans-serif;
      color: #2d232e;
    }
    #${OVERLAY_ID}.mbf-is-open { opacity: 1; }
    #${OVERLAY_ID} * { box-sizing: border-box; }

    #${OVERLAY_ID} .mbf-card {
      width: 100%;
      height: 100%;
      max-width: 600px;
      max-height: 100%;
      background-color: #fff;
      border-radius: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      transform: scale(0.88);
      transition: transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    #${OVERLAY_ID}.mbf-is-open .mbf-card { transform: scale(1); }

    #${OVERLAY_ID} .mbf-progress { display: flex; gap: 6px; padding: 16px 28px 0; flex-shrink: 0; }
    #${OVERLAY_ID} .mbf-dot {
      height: 4px;
      flex: 1;
      border-radius: 99px;
      background-color: #dfdad7;
      overflow: hidden;
    }
    #${OVERLAY_ID} .mbf-dot:after {
      content: "";
      display: block;
      height: 100%;
      width: 0;
      background-color: #750550;
      transition: width 0.35s ease;
    }
    #${OVERLAY_ID} .mbf-dot.is-active:after,
    #${OVERLAY_ID} .mbf-dot.is-done:after { width: 100%; }

    #${OVERLAY_ID} .mbf-header {
      padding: 16px 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #ddd;
      flex-shrink: 0;
    }
    #${OVERLAY_ID} .mbf-header-icon {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      color: #750550;
      display: flex;
      transition: opacity 0.15s ease;
    }
    #${OVERLAY_ID} .mbf-header-icon svg { width: 100%; height: 100%; }
    #${OVERLAY_ID} .mbf-header-title { font-weight: 700; font-size: 1.0625rem; transition: opacity 0.15s ease; }

    #${OVERLAY_ID} .mbf-body {
      padding: 8px 28px 32px;
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
    }
    #${OVERLAY_ID} .mbf-body::-webkit-scrollbar { width: 10px; }
    #${OVERLAY_ID} .mbf-body::-webkit-scrollbar-thumb {
      border-radius: 99px;
      background-color: #ddd;
      border: 3px solid #fff;
    }

    #${OVERLAY_ID} .mbf-step { display: none; min-height: 100%; flex-direction: column; }
    #${OVERLAY_ID} .mbf-step.is-active { display: flex; animation: mbf-step-in 0.32s ease both; }
    #${OVERLAY_ID} .mbf-step.is-leaving { display: flex; animation: mbf-step-out 0.18s ease both; }

    @keyframes mbf-step-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes mbf-step-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-6px); }
    }

    #${OVERLAY_ID} .mbf-hero { text-align: center; margin: auto 0; padding: 24px 0; }
    #${OVERLAY_ID} .mbf-route svg { width: 100%; max-width: 280px; height: auto; display: block; margin: 0 auto 24px; }
    #${OVERLAY_ID} .mbf-hero h1 { font-size: 1.75rem; line-height: 1.25; font-weight: 800; margin: 0 0 12px; }
    #${OVERLAY_ID} .mbf-hero p {
      margin: 0;
      color: #6b5f63;
      font-size: 1rem;
      line-height: 1.6;
      max-width: 34ch;
      margin-inline: auto;
    }

    #${OVERLAY_ID} .mbf-rtf { padding-top: 16px; }
    #${OVERLAY_ID} .mbf-rtf p { margin: 0 0 14px; line-height: 1.65; font-size: 0.95rem; }
    #${OVERLAY_ID} .mbf-rtf h3 { font-size: 1rem; font-weight: 700; margin: 22px 0 8px; }
    #${OVERLAY_ID} .mbf-rtf h3:first-child { margin-top: 0; }
    #${OVERLAY_ID} .mbf-rtf ul { margin: 0 0 14px; padding-left: 20px; }
    #${OVERLAY_ID} .mbf-rtf li { line-height: 1.6; font-size: 0.95rem; margin-bottom: 4px; }

    #${OVERLAY_ID} .mbf-auth { display: flex; flex-direction: column; gap: 18px; padding-top: 12px; height: 100%; }
    #${OVERLAY_ID} .mbf-auth-logo { text-align: center; margin-bottom: 4px; }
    #${OVERLAY_ID} .mbf-auth-logo img { max-width: 400px;  margin: 0 auto; display: block; }

    #${OVERLAY_ID} .mbf-auth-tabs { display: flex; gap: 8px; background-color: #f3f0ef; border-radius: 10px; padding: 4px; }
    #${OVERLAY_ID} .mbf-auth-tab {
      flex: 1;
      border: 0;
      background: transparent;
      padding: 10px;
      border-radius: 8px;
      font-family: "Outfit", sans-serif;
      font-weight: 600;
      font-size: 0.9rem;
      color: #6b5f63;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    #${OVERLAY_ID} .mbf-auth-tab.is-active { background-color: #fff; color: #750550; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

    #${OVERLAY_ID} .mbf-auth-panel { display: none; flex-direction: column; gap: 14px; }
    #${OVERLAY_ID} .mbf-auth-panel.is-active { display: flex; }

    #${OVERLAY_ID} .mbf-auth label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #2d232e;
    }
    #${OVERLAY_ID} .mbf-auth input {
      font-family: "Outfit", sans-serif;
      font-size: 0.95rem;
      padding: 11px 12px;
      border-radius: 8px;
      border: 1px solid #ddd;
      outline: none;
      transition: border-color 0.15s ease;
    }
    #${OVERLAY_ID} .mbf-auth input:focus { border-color: #750550; }

    #${OVERLAY_ID} .mbf-auth-signup-fields { display: none; flex-direction: column; gap: 14px; }
    #${OVERLAY_ID} .mbf-auth-signup-fields.is-visible { display: flex; }

    #${OVERLAY_ID} .mbf-auth-divider { display: flex; align-items: center; gap: 10px; color: #a89ea1; font-size: 0.8rem; }
    #${OVERLAY_ID} .mbf-auth-divider:before,
    #${OVERLAY_ID} .mbf-auth-divider:after { content: ""; flex: 1; height: 1px; background-color: #ddd; }

    #${OVERLAY_ID} .mbf-btn-google {
      background-color: #fff;
      border: 1px solid #ddd;
      color: #2d232e;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
    }
    #${OVERLAY_ID} .mbf-btn-google svg { width: 18px; height: 18px; }
    #${OVERLAY_ID} .mbf-btn-google:hover,
    #${OVERLAY_ID} .mbf-btn-google:focus-visible { background-color: #f7f5f4; }

    #${OVERLAY_ID} .mbf-auth-submit { width: 100%; }

    #${OVERLAY_ID} .mbf-auth-error {
      color: #b3261e;
      font-size: 0.85rem;
      margin: -6px 0 0;
      min-height: 1.1em;
    }

    #${OVERLAY_ID} .mbf-auth-hint {
      color: #6b5f63;
      font-size: 0.85rem;
      line-height: 1.5;
      margin: 0;
    }

    /* ---- Page de dons ---- */
    #${OVERLAY_ID} .mbf-thanks { text-align: center; margin: auto 0; padding: 24px 0; }
    #${OVERLAY_ID} .mbf-thanks h2 { font-size: 1.4rem; font-weight: 800; margin: 0 0 12px; }
    #${OVERLAY_ID} .mbf-thanks p { color: #6b5f63; font-size: 0.95rem; line-height: 1.65; max-width: 36ch; margin: 0 auto; }
    #${OVERLAY_ID} .mbf-thanks p + p { margin-top: 10px; }

    #${OVERLAY_ID} .mbf-footer-wrap { position: relative; flex-shrink: 0; }
    #${OVERLAY_ID} .mbf-footer-wrap:before {
      content: "";
      display: block;
      position: absolute;
      top: -40px;
      left: 0;
      right: 0;
      height: 40px;
      background-image: linear-gradient(to top, rgba(255, 255, 255, 0.9), transparent);
      pointer-events: none;
    }
    #${OVERLAY_ID} .mbf-footer {
      padding: 18px 28px 24px;
      display: none;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #ddd;
    }
    #${OVERLAY_ID} .mbf-footer.is-active { display: flex; }

    #${OVERLAY_ID} .mbf-btn {
      padding: 12px 22px;
      border-radius: 8px;
      background-color: transparent;
      border: 0;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.1s ease;
      font-family: "Outfit", sans-serif;
    }
    #${OVERLAY_ID} .mbf-btn:active { transform: scale(0.97); }

    #${OVERLAY_ID} .mbf-btn-ghost:hover,
    #${OVERLAY_ID} .mbf-btn-ghost:focus-visible { background-color: #dfdad7; }

    #${OVERLAY_ID} .mbf-btn-primary { background-color: #750550; color: #fff; }
    #${OVERLAY_ID} .mbf-btn-primary:hover,
    #${OVERLAY_ID} .mbf-btn-primary:focus-visible { background-color: #4a0433; }

    #${OVERLAY_ID} .mbf-btn-coffee {
      background-color: #ffdd00;
      color: #2d232e;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    #${OVERLAY_ID} .mbf-btn-coffee svg { width: 18px; height: 18px; }
    #${OVERLAY_ID} .mbf-btn-coffee:hover,
    #${OVERLAY_ID} .mbf-btn-coffee:focus-visible { background-color: #e6c700; }

    @media (min-width: 640px) {
      #${OVERLAY_ID} { padding: 24px; }
      #${OVERLAY_ID} .mbf-card { height: min(760px, 92vh); border-radius: 20px; }
    }

    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID} { transition: none; }
      #${OVERLAY_ID} .mbf-card { transition: none; }
      #${OVERLAY_ID} .mbf-step.is-active,
      #${OVERLAY_ID} .mbf-step.is-leaving { animation: none; }
    }
  `;

  var stepWelcome = `
    <section class="mbf-step is-active" data-step="0">
    <img src="src/iphone-screen-welcome.png" alt="MBF Screenshot Welcome" style="width: 100%; height: auto; margin-bottom: 24px;">
      <div class="mbf-hero">
        <h1>Le bus arrive à quelle heure ?</h1>
        <p>Cette question, vous ne la poserez même plus. My Bus Finder redéfinit la façon dont vous naviguez avec les transports en commun. Plus simple, plus rapide, plus efficace.</p>
      </div>
    </section>
  `;


    var stepTerms = `
    <section class="mbf-step" data-step="1">
        <div class="mbf-rtf">

        <h2>Bienvenue sur My Bus Finder !</h2>
        <p>En continuant, vous acceptez la Politique de Confidentialité consultable <a href="Policonf.pdf" target="_blank">en cliquant ici</a>.</p>

        <h2>Conditions Générales d'Utilisation</h2>

        <p><strong>Dernière mise à jour : 2 septembre 2026</strong></p>

        <p>
            Bienvenue sur <strong>My Bus Finder</strong>. En utilisant cette application,
            vous acceptez les présentes Conditions Générales d'Utilisation, ci-après
            dénommées les « CGU ».
        </p>

        <p>
            Si vous n'acceptez pas ces conditions, nous vous invitons à ne pas utiliser
            le service.

        </p>

        <h3>1. Éditeur du service</h3>

        <p>
            My Bus Finder est édité par :
            <strong>Becab Development</strong><br>
            Mohamed el Bechir ABIDI<br>
            Entrepreneur individuel / Auto-entrepreneur<br>
            SIREN : 999 304 751<br>
            22 Boulevard du Riou<br>
            06400 Cannes - France<br>
            Email :
            <a href="mailto:bechir.abidi06@gmail.com">bechir.abidi06@gmail.com</a>
        </p>

        <p>
            Le service est hébergé et exploité techniquement par
            <strong>BecabDev Solutions Web</strong>, localisé au siège social de l'entreprise, activité / entité technique
            rattachée à Becab Development.
            L'appel des API My Bus Finder depuis un service externe vaut acceptation des présentes CGU.
            Une mention "Powered by My Bus Finder" ou équivalent devra être affichée sur le service externe de manière visible, sauf accord écrit préalable de Becab Development.
        </p>

        <h3>2. Description du service</h3>

        <p>
            My Bus Finder est une application d'information sur les transports en commun.
            Elle permet notamment, selon les données disponibles, de consulter :
        </p>

        <ul>
            <li>les lignes de transport ;</li>
            <li>les arrêts ;</li>
            <li>les horaires théoriques ou estimés ;</li>
            <li>les prochains passages ;</li>
            <li>la position des véhicules en temps réel ;</li>
            <li>les destinations des véhicules ;</li>
            <li>les informations relatives aux perturbations ou au trafic ;</li>
            <li>des informations techniques ou historiques concernant certains véhicules.</li>
        </ul>

        <p>
            Les fonctionnalités disponibles peuvent varier selon les réseaux de transport,
            les données accessibles et les évolutions de l'application.
        </p>

        <h3>3. Sources des données de transport</h3>

        <p>
            My Bus Finder utilise notamment des données de transport de développement aux formats
            <strong>GTFS</strong> et <strong>GTFS Realtime (GTFS-RT)</strong>, ainsi que
            d'autres données ou services mis à disposition par des opérateurs de transport,
            autorités organisatrices, fournisseurs de données ou sources publiques.
        </p>

        <p>
            My Bus Finder utilise des formats de données propriétaires (appelés « <strong>MBF Setvars</strong> ») 
            pour certaines fonctionnalités, notamment pour les informations des véhicules, les 
            paramètres personnels ainsi que pour les fonctionnalités liées à l'expérience utilisateur.
        </p>

        <p>
            Certaines données affichées par My Bus Finder proviennent donc de tiers.
            My Bus Finder peut agréger, traiter, organiser et présenter ces données afin
            de faciliter leur consultation.
        </p>

        <p>
            L'affichage d'un réseau de transport, d'une marque, d'un nom ou d'un logo
            ne signifie pas nécessairement qu'il existe un partenariat, une affiliation
            ou une approbation officielle entre My Bus Finder et l'organisme concerné.
            Toute association ou affiliation implicite est purement fortuite et ne saurait être interprétée comme une approbation officielle.
        </p>

        <h3>4. Fiabilité et caractère informatif des données</h3>

        <p>
            Les informations affichées par My Bus Finder sont fournies à titre informatif.
            Nous faisons notre possible pour afficher des données fiables et actualisées,
            mais nous ne pouvons garantir leur exactitude, leur exhaustivité ou leur
            disponibilité permanente.
        </p>

        <p>
            Les horaires, positions et temps d'arrivée peuvent varier par rapport à la
            réalité, notamment en raison de :
        </p>

        <ul>
            <li>retards liés au trafic ;</li>
            <li>travaux ou déviations temporaires ;</li>
            <li>incidents sur le réseau de transport ;</li>
            <li>modifications d'horaires ;</li>
            <li>retards de transmission des données ;</li>
            <li>pannes ou coupures des systèmes GPS des véhicules ;</li>
            <li>erreurs provenant des sources de données ;</li>
            <li>indisponibilité temporaire d'un service tiers.</li>
        </ul>

        <p>
            Une position affichée sur la carte ne garantit pas qu'un véhicule soit
            effectivement présent à cette position au moment de la consultation.
            Il peut exister un décalage entre la position affichée et la position réelle du véhicule.
        </p>

        <p>
            De même, un horaire ou un temps d'arrivée affiché ne constitue pas une
            garantie de passage ou de ponctualité.
        </p>

        <p>
            Pour toute information importante concernant un déplacement, nous vous
            recommandons de consulter également les sources officielles du réseau de
            transport concerné.
            My Bus Finder et Becab Development ne sauraient être tenus responsable pour tout litige ou préjudice résultant de l'utilisation des informations affichées par l'application.
            Becab Development n'assure aucunement le service client des réseaux de transport et ne peut être tenu responsable de l'absence d'assistance ou d'information de la part des opérateurs de transport.
        </p>

        <h3>5. Responsabilité</h3>

        <p>
            My Bus Finder est un outil d'information et d'aide à la consultation des
            données de transport.
        </p>

        <p>
            L'utilisateur reste responsable de l'organisation de ses déplacements et
            des décisions prises sur la base des informations affichées par l'application.
        </p>

        <p>
            Dans les limites autorisées par la législation applicable, Becab Development
            ne pourra être tenu responsable notamment :
        </p>

        <ul>
            <li>d'un bus, tramway ou autre véhicule manqué ;</li>
            <li>d'un retard ou d'une annulation de transport ;</li>
            <li>d'une correspondance manquée ;</li>
            <li>d'une donnée incorrecte, incomplète ou indisponible ;</li>
            <li>d'une erreur de localisation d'un véhicule ;</li>
            <li>d'une indisponibilité temporaire de l'application ;</li>
            <li>d'un dysfonctionnement d'un réseau de transport ;</li>
            <li>d'une erreur provenant d'une source de données tierce.</li>
        </ul>

        <p>
            Aucune disposition des présentes CGU ne vise à exclure ou limiter une
            responsabilité qui ne pourrait légalement être exclue ou limitée.
        </p>

        <h3>6. Géolocalisation</h3>

        <p>
            My Bus Finder peut vous proposer d'utiliser la géolocalisation de votre
            appareil afin d'améliorer certaines fonctionnalités, notamment pour afficher
            les arrêts ou informations situés à proximité de votre position.
        </p>

        <p>
            La géolocalisation est facultative. Vous pouvez refuser son utilisation ou
            retirer votre autorisation à tout moment depuis les paramètres de votre
            navigateur ou de votre appareil.
        </p>

        <p>
            <strong>Votre position est utilisée uniquement localement sur votre appareil.</strong>
            My Bus Finder ne stocke pas votre position sur ses serveurs et ne la transmet
            pas à Becab Development pour les fonctionnalités de géolocalisation.
        </p>

        <p>
            Le refus de la géolocalisation peut limiter certaines fonctionnalités,
            notamment l'affichage automatique des arrêts proches de vous.
        </p>

        <h3>7. Données personnelles et respect de la vie privée</h3>

        <p>
            My Bus Finder accorde une attention particulière à la protection de votre
            vie privée et de vos données personnelles. Votre vie privée est notre priorité, et nous nous engageons à respecter la réglementation applicable en matière de protection des données.
        </p>

        <p>
            À ce jour, l'application ne nécessite pas la création d'un compte utilisateur
            et ne dispose pas d'une base de données destinée à enregistrer des profils
            utilisateurs.
        </p>

        <p>
            Toutefois, certains services techniques nécessaires au fonctionnement de
            l'application, ainsi que des services de mesure d'audience, peuvent traiter
            certaines données techniques conformément à leurs propres conditions et à la
            réglementation applicable.
        </p>

        <p>
            Les modalités détaillées relatives aux données personnelles, aux finalités
            des traitements, aux destinataires, aux durées de conservation et à vos droits
            sont précisées dans la Politique de confidentialité de My Bus Finder.
        </p>

        <p>
          <strong>Becab Development ne collecte pas de données personnelles sensibles, ne vend et ne vendra jamais vos informations à des tiers.</strong>
        </p>

        <h3>8. Cookies et technologies similaires</h3>

        <p>
            My Bus Finder utilise des cookies et/ou des technologies similaires.
        </p>

        <p>
            Certains cookies peuvent être nécessaires au bon fonctionnement du service,
            notamment pour mémoriser certains choix ou assurer des fonctionnalités
            techniques.
        </p>

        <p>
            L'application utilise également, le cas échéant et conformément à vos choix,
            des outils de mesure d'audience tels que <strong>Google Analytics</strong>.
        </p>

        <p>
            Lorsque la réglementation applicable exige votre consentement avant le dépôt
            ou la lecture de certains cookies ou traceurs, votre consentement est demandé
            avant leur utilisation.
        </p>

        <p>
            Vous pouvez modifier vos préférences relatives aux cookies à tout moment
            depuis l'outil de gestion des cookies mis à votre disposition, lorsqu'il est
            disponible.
        </p>

        <h3>9. Services et technologies tiers</h3>

        <p>
            Afin de fonctionner, My Bus Finder peut utiliser différents services,
            bibliothèques, infrastructures ou fournisseurs tiers, notamment :
        </p>

        <ul>
            <li>Cloudflare ;</li>
            <li>Google Analytics ;</li>
            <li>Leaflet ;</li>
            <li>MapLibre ;</li>
            <li>des services CDN ;</li>
            <li>des fournisseurs de données GTFS et GTFS Realtime ;</li>
            <li>d'autres services techniques nécessaires au fonctionnement de l'application.</li>
        </ul>

        <p>
            Ces services peuvent évoluer au fil du développement de My Bus Finder.
            Nous accordons une importance particulière à la sélection de nos partenaires et fournisseurs tiers, en privilégiant ceux qui respectent la confidentialité des utilisateurs et la sécurité des données.
            En majorité, ces services sont à source ouverte (open source) pour favoriser la transparence et la confiance dans l'utilisation de l'application.
        </p>

        <p>
            Certains fournisseurs tiers peuvent traiter des données techniques,
            telles que l'adresse IP, le type de navigateur, les informations relatives
            à l'appareil ou des données nécessaires à la fourniture de leurs services.
        </p>

        <p>
            Ces traitements sont susceptibles d'être soumis aux politiques de
            confidentialité et conditions d'utilisation propres aux fournisseurs concernés.
        </p>

        <h3>10. Publicité</h3>

        <p>
            My Bus Finder peut intégrer des publicités à l'avenir afin de contribuer au
            financement, au maintien et au développement du service.
        </p>

        <p>
            Si des services publicitaires utilisant des cookies ou d'autres traceurs
            nécessitant votre consentement sont mis en place, les utilisateurs seront
            informés conformément à la réglementation applicable avant l'activation des
            traceurs concernés.
        </p>

        <p>
            La présente disposition pourra être complétée ou modifiée lors de la mise en
            place effective d'un service publicitaire.
        </p>

        <h3>11. Absence de compte utilisateur</h3>

        <p>
            À ce jour, My Bus Finder ne nécessite pas la création d'un compte utilisateur.
        </p>

        <p>
            Si un système de compte est ajouté à l'avenir, les utilisateurs seront informés
            des données collectées et des conditions applicables avant ou lors de la
            création d'un compte.
        </p>

        <p>
            Les présentes CGU et la Politique de confidentialité pourront alors être mises
            à jour afin de prendre en compte ces nouvelles fonctionnalités.
        </p>

        <h3>12. Utilisation raisonnable du service</h3>

        <p>
            Vous vous engagez à utiliser My Bus Finder de manière raisonnable, légale et
            conforme à la finalité du service.
        </p>

        <p>Il est formellement interdit de :</p>

        <ul>
            <li>perturber ou tenter de perturber le fonctionnement du service ;</li>
            <li>tenter d'accéder sans autorisation aux systèmes de l'application ;</li>
            <li>contourner les mesures techniques ou de sécurité ;</li>
            <li>effectuer une extraction massive ou abusive des données ;</li>
            <li>utiliser des robots ou scripts susceptibles de surcharger le service afin de nuire à son fonctionnement ;</li>
            <li>utiliser le service à des fins illégales ;</li>
            <li>opérer à l'ingénierie inverse ou à la décompilation du code de la logique métier (back-end) ;</li>
            <li>porter atteinte aux droits de Becab Development ou de tiers.</li>
        </ul>

        <p>
            Becab Development se réserve le droit de suspendre ou d'interrompre l'accès
            au service en cas d'utilisation abusive ou non conforme aux présentes CGU.
            <strong>Des poursuites judiciaires pourront être engagées en cas de violation des droits de Becab Development ou de tiers.</strong>
        </p>

        <h3>13. Propriété intellectuelle</h3>

        <p>
            Les éléments propres à My Bus Finder, notamment son interface, son design,
            ses textes, son code, ses fonctionnalités, son identité visuelle et son
            organisation, sont protégés par les règles applicables en matière de propriété
            intellectuelle.
        </p>

        <p>
            Sauf indication contraire, ces éléments appartiennent à Becab Development ou
            sont utilisés avec les autorisations nécessaires.
        </p>

        <p>
            Toute reproduction, modification, distribution ou exploitation non autorisée
            des éléments propres à My Bus Finder peut être interdite par la législation
            applicable.
        </p>

        <p>
            Les marques, noms, logos et données appartenant à des réseaux de transport ou
            à d'autres tiers restent la propriété de leurs titulaires respectifs.
        </p>

        <h3>14. Disponibilité et évolution du service</h3>

        <p>
            Becab Development s'efforce d'assurer le bon fonctionnement et la disponibilité
            de My Bus Finder.
        </p>

        <p>
            Toutefois, le service peut être temporairement indisponible notamment en cas :
        </p>

        <ul>
            <li>de maintenance ;</li>
            <li>de mise à jour ;</li>
            <li>de problème technique ;</li>
            <li>de problème chez un fournisseur tiers ;</li>
            <li>d'indisponibilité des données de transport ;</li>
            <li>d'un incident de sécurité ;</li>
            <li>de force majeure.</li>
        </ul>

        <p>
            Becab Development se réserve le droit de modifier, ajouter, supprimer ou
            faire évoluer tout ou partie des fonctionnalités de My Bus Finder.
        </p>

        <h3>15. Sécurité</h3>

        <p>
            Becab Development met en œuvre des mesures techniques et organisationnelles
            raisonnables afin de contribuer à la sécurité du service.
        </p>

        <p>
            Toutefois, aucun système informatique ou service accessible via Internet ne
            peut garantir une sécurité absolue.
        </p>

        <h3>16. Liens et services externes</h3>

        <p>
            My Bus Finder peut contenir des liens ou références vers des sites, services
            ou contenus exploités par des tiers.
        </p>

        <p>
            Becab Development ne contrôle pas nécessairement ces services externes et ne
            peut être tenu responsable de leur contenu, de leur disponibilité ou de leurs
            pratiques en matière de confidentialité.
        </p>

        <h3>17. Modification des présentes conditions</h3>

        <p>
            Les présentes Conditions Générales d'Utilisation peuvent être modifiées afin
            de prendre en compte notamment :
        </p>

        <ul>
            <li>une évolution de My Bus Finder ;</li>
            <li>l'ajout de nouvelles fonctionnalités ;</li>
            <li>la création éventuelle de comptes utilisateurs ;</li>
            <li>la mise en place de publicités ;</li>
            <li>une évolution technique ;</li>
            <li>une évolution légale ou réglementaire.</li>
        </ul>

        <p>
            En cas de modification importante, une information appropriée pourra être
            affichée dans l'application.
        </p>

        <p>
            La version applicable des présentes CGU est celle disponible au moment de
            l'utilisation du service.
        </p>

        <h3>18. Droit applicable</h3>

        <p>
            Les présentes Conditions Générales d'Utilisation sont soumises au droit
            français.
        </p>

        <p>
            Si vous êtes un consommateur résidant dans un autre État membre de l'Union
            européenne, vous conservez le bénéfice des dispositions impératives qui
            pourraient être applicables dans votre pays de résidence.
        </p>

        <h3>19. Contact</h3>

        <p>
            Pour toute question concernant My Bus Finder ou les présentes Conditions
            Générales d'Utilisation, vous pouvez contacter :
        </p>

        <p>
            <strong>Becab Development</strong><br>
            Mohamed el Bechir ABIDI<br>
            Email :
            <a href="mailto:bechir.abidi06@gmail.com">bechir.abidi06@gmail.com</a>
        </p>

        <h3>20. Acceptation des conditions</h3>

        <p>
            En utilisant My Bus Finder, vous reconnaissez avoir pris connaissance des
            présentes Conditions Générales d'Utilisation et acceptez de les respecter.
            Toute violation de ces conditions peut entraîner la suspension ou l'interruption de l'accès au service, ainsi que des poursuites judiciaires en dernier recours.
        </p>

        <p>
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service et <a href="https://www.google.com">cliquez ici</a> pour accéder à un moteur de recherche pour quitter le service.
        </p>

        <p> Map data from OSM contributors, licensed under ODbL.</p>
        <p>© 2026 Becab Development. All rights reserved.</p>

        </div>
    </section>
    `;

  var stepAuth = `
    <section class="mbf-step" data-step="2">
      <div class="mbf-auth">

        <div class="mbf-auth-logo">
          <img src="src/becabconnect.png" alt="My Bus Finder" id="mbf-auth-logo-img">
        </div>

        <div class="mbf-auth-tabs" id="mbf-auth-tabs">
          <button type="button" class="mbf-auth-tab is-active" data-tab="login">Connexion</button>
          <button type="button" class="mbf-auth-tab" data-tab="signup">Inscription</button>
        </div>

        <!-- Panneau : email / mot de passe / Google (+ champs d'inscription) -->
        <div class="mbf-auth-panel is-active" data-panel="credentials">

          <div class="mbf-auth-signup-fields" id="mbf-signup-fields">
            <label>Prénom
              <input type="text" id="mbf-signup-firstname" autocomplete="given-name">
            </label>
            <label>Nom
              <input type="text" id="mbf-signup-lastname" autocomplete="family-name">
            </label>
            <label>Date de naissance
              <input type="date" id="mbf-signup-birthdate" autocomplete="bday">
            </label>
          </div>

          <button type="button" class="mbf-btn mbf-btn-google" id="mbf-btn-google">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.5-5.5C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C41.5 36 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Continuer avec Google
          </button>

          <div class="mbf-auth-divider"><span>ou</span></div>

          <label>Email
            <input type="email" id="mbf-auth-email" autocomplete="email" placeholder="vous@exemple.com">
          </label>
          <label>Mot de passe
            <input type="password" id="mbf-auth-password" autocomplete="current-password" placeholder="••••••••">
          </label>

          <p class="mbf-auth-error" id="mbf-auth-error" aria-live="polite"></p>

          <button type="button" class="mbf-btn mbf-btn-primary mbf-auth-submit" id="mbf-auth-submit">Se connecter</button>
        </div>

        <!-- Panneau : complément de profil (utilisé si Google ne fournit pas la date de naissance) -->
        <div class="mbf-auth-panel" data-panel="profile">
          <p class="mbf-auth-hint">Encore une petite étape : dites-nous en un peu plus sur vous.</p>

          <label>Prénom
            <input type="text" id="mbf-profile-firstname" autocomplete="given-name">
          </label>
          <label>Nom
            <input type="text" id="mbf-profile-lastname" autocomplete="family-name">
          </label>
          <label>Date de naissance
            <input type="date" id="mbf-profile-birthdate" autocomplete="bday">
          </label>

          <p class="mbf-auth-error" id="mbf-profile-error" aria-live="polite"></p>

          <button type="button" class="mbf-btn mbf-btn-primary" id="mbf-btn-profile-submit">Continuer</button>
        </div>

        <div class="mbf-auth-panel" data-panel="verify">
          <p class="mbf-auth-hint">
            Un email de confirmation a été envoyé à <strong id="mbf-verify-email"></strong>.
            Cliquez sur le bouton "C'est bien moi", puis revenez ici ;)
          </p>

          <p class="mbf-auth-error" id="mbf-verify-error" aria-live="polite"></p>

          <button type="button" class="mbf-btn mbf-btn-primary" id="mbf-btn-verify-check">J'ai vérifié mon adresse</button>
          <button type="button" class="mbf-btn mbf-btn-ghost" id="mbf-btn-verify-resend">Renvoyer l'email</button>
        </div>

      </div>
    </section>
  `;

    var stepDonate = `
    <section class="mbf-step" data-step="3">
        <div class="mbf-thanks">
        <h2>☕ Un petit café pour faire avancer My Bus Finder</h2>
        <p>My Bus Finder est un projet indépendant, développé par un étudiant en développement informatique sur mon temps libre pour vous aider à trouver votre bus ou votre tram, sans prise de tête.</p>
        <p>Derrière l'application, il y a du temps de développement, des serveurs et beaucoup d'envie de continuer à l'améliorer. Si vous utilisez My Bus Finder et que vous souhaitez donner un petit coup de pouce au projet, vous pouvez m'offrir un café. ❤️</p>
        <p>Votre soutien contribue directement à <strong>financer les serveurs et le développement</strong> de nouvelles fonctionnalités.</p>
        <p><strong>Évidemment, rien n'est obligatoire :</strong> My Bus Finder restera gratuit et accessible à tous, mais votre soutien est grandement apprécié et permettra de garantir le fonctionnement de l'application sur le long terme. ❤️</p>
        <p>Vous pourrez toujours le faire plus tard si vous le souhaitez, en cliquant sur le coeur dans le menu.</p>
        </div>
    </section>
    `;

  var footerWelcome = `
    <div class="mbf-footer is-active" data-footer="0">
      <button class="mbf-btn mbf-btn-primary" id="mbf-btn-next" type="button">Suivant</button>
    </div>
  `;

  var footerTerms = `
    <div class="mbf-footer" data-footer="1">
      <button class="mbf-btn mbf-btn-ghost" id="mbf-btn-back" type="button">Retour</button>
      <button class="mbf-btn mbf-btn-primary" id="mbf-btn-accept" type="button">Accepter</button>
    </div>
  `;

  var footerAuth = `
    <div class="mbf-footer" data-footer="2">
      <button class="mbf-btn mbf-btn-ghost" id="mbf-btn-auth-back" type="button">Retour</button>
    </div>
  `;

  var footerDonate = `
    <div class="mbf-footer" data-footer="3">
      <button class="mbf-btn mbf-btn-ghost" id="mbf-btn-skip" type="button">Plus tard</button>
      <button class="mbf-btn mbf-btn-coffee" id="mbf-btn-donate" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"></path>
          <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"></path>
          <path d="M8 2c0 1-1 1-1 2s1 1 1 2"></path>
          <path d="M12 2c0 1-1 1-1 2s1 1 1 2"></path>
        </svg>
        Faire un don
      </button>
    </div>
  `;

  var HTML = `
    <div id="${OVERLAY_ID}" role="dialog" aria-modal="true" aria-labelledby="mbf-header-title">
      <div class="mbf-card">

        <div class="mbf-progress" aria-hidden="true">
          <span class="mbf-dot is-active" data-dot="0"></span>
          <span class="mbf-dot" data-dot="1"></span>
          <span class="mbf-dot" data-dot="2"></span>
          <span class="mbf-dot" data-dot="3"></span>
        </div>

        <div class="mbf-header">
          <span class="mbf-header-icon" id="mbf-header-icon">${HEADER_ICONS[0]}</span>
          <span class="mbf-header-title" id="mbf-header-title">Bienvenue</span>
        </div>

        <div class="mbf-body" id="mbf-body">
          ${stepWelcome}
          ${stepTerms}
          ${stepAuth}
          ${stepDonate}
        </div>

        <div class="mbf-footer-wrap">
          ${footerWelcome}
          ${footerTerms}
          ${footerAuth}
          ${footerDonate}
        </div>

      </div>
    </div>
  `;

  var els = {};
  var current = 0;
  var isInjected = false;

  // État de l'écran d'authentification
  var authMode = "login"; // "login" | "signup"

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function injectMarkup() {
    if (document.getElementById(OVERLAY_ID)) return;
    var wrapper = document.createElement("div");
    wrapper.innerHTML = HTML.trim();
    document.body.appendChild(wrapper.firstElementChild);
  }

  function cacheElements() {
    var overlay = document.getElementById(OVERLAY_ID);
    els.overlay = overlay;
    els.steps = Array.prototype.slice.call(overlay.querySelectorAll(".mbf-step"));
    els.footers = Array.prototype.slice.call(overlay.querySelectorAll(".mbf-footer"));
    els.dots = Array.prototype.slice.call(overlay.querySelectorAll(".mbf-dot"));
    els.body = overlay.querySelector("#mbf-body");
    els.headerIcon = overlay.querySelector("#mbf-header-icon");
    els.headerTitle = overlay.querySelector("#mbf-header-title");

    els.authTabs = Array.prototype.slice.call(overlay.querySelectorAll(".mbf-auth-tab"));
    els.authPanels = Array.prototype.slice.call(overlay.querySelectorAll(".mbf-auth-panel"));
    els.signupFields = overlay.querySelector("#mbf-signup-fields");
    els.signupFirstName = overlay.querySelector("#mbf-signup-firstname");
    els.signupLastName = overlay.querySelector("#mbf-signup-lastname");
    els.signupBirthDate = overlay.querySelector("#mbf-signup-birthdate");
    els.authEmail = overlay.querySelector("#mbf-auth-email");
    els.authPassword = overlay.querySelector("#mbf-auth-password");
    els.authError = overlay.querySelector("#mbf-auth-error");
    els.authSubmit = overlay.querySelector("#mbf-auth-submit");

    els.profileFirstName = overlay.querySelector("#mbf-profile-firstname");
    els.profileLastName = overlay.querySelector("#mbf-profile-lastname");
    els.profileBirthDate = overlay.querySelector("#mbf-profile-birthdate");
    els.profileError = overlay.querySelector("#mbf-profile-error");

    els.verifyEmailLabel = overlay.querySelector("#mbf-verify-email");
    els.verifyError = overlay.querySelector("#mbf-verify-error");
  }

  function bindEvents() {
    els.overlay.querySelector("#mbf-btn-next").addEventListener("click", function () {
      goToStep(1);
    });
    els.overlay.querySelector("#mbf-btn-back").addEventListener("click", function () {
      goToStep(0);
    });
    els.overlay.querySelector("#mbf-btn-accept").addEventListener("click", function () {
      goToStep(2);
    });
    els.overlay.querySelector("#mbf-btn-auth-back").addEventListener("click", function () {
      goToStep(1);
    });
    els.overlay.querySelector("#mbf-btn-skip").addEventListener("click", close);
    els.overlay.querySelector("#mbf-btn-donate").addEventListener("click", function () {
      window.open("https://buymeacoffee.com/mybusfinder", "_blank", "noopener");
    });

    els.authTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        authMode = tab.getAttribute("data-tab");
        els.authTabs.forEach(function (t) { t.classList.toggle("is-active", t === tab); });
        els.signupFields.classList.toggle("is-visible", authMode === "signup");
        els.authSubmit.textContent = authMode === "signup" ? "Créer mon compte" : "Se connecter";
        setAuthError("");
      });
    });

    els.overlay.querySelector("#mbf-btn-google").addEventListener("click", function () {
      var fb = ensureFirebase();
      if (!fb) return;
      setAuthError("");
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then(function (result) {
          var user = result.user;
          var isNewUser = !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser);
          if (isNewUser) {

            switchAuthPanel("profile");
            return;
          }
          checkEmailVerification(user);
        })
        .catch(function (err) { setAuthError(translateAuthError(err)); });
    });

    els.authSubmit.addEventListener("click", function () {
      var fb = ensureFirebase();
      if (!fb) return;
      setAuthError("");

      var email = (els.authEmail.value || "").trim();
      var password = els.authPassword.value || "";

      if (!email || !password) {
        setAuthError("Merci de renseigner un email et un mot de passe.");
        return;
      }

      if (authMode === "signup") {
        var firstName = (els.signupFirstName.value || "").trim();
        var lastName = (els.signupLastName.value || "").trim();
        var birthDate = els.signupBirthDate.value || "";

        if (!firstName || !lastName || !birthDate) {
          setAuthError("Merci de renseigner votre prénom, votre nom et votre date de naissance.");
          return;
        }

        firebase.auth().createUserWithEmailAndPassword(email, password)
          .then(function (result) {
            var user = result.user;
            return user.updateProfile({ displayName: firstName + " " + lastName })
              .then(function () {
                return saveUserProfile(user.uid, {
                  firstName: firstName,
                  lastName: lastName,
                  birthDate: birthDate,
                  email: email,
                  createdAt: new Date().toISOString(),
                });
              })
              .then(function () { checkEmailVerification(user); });
          })
          .catch(function (err) { setAuthError(translateAuthError(err)); });
      } else {
        firebase.auth().signInWithEmailAndPassword(email, password)
          .then(function (result) { checkEmailVerification(result.user); })
          .catch(function (err) { setAuthError(translateAuthError(err)); });
      }
    });

    els.overlay.querySelector("#mbf-btn-profile-submit").addEventListener("click", function () {
      var fb = ensureFirebase();
      if (!fb) return;
      setProfileError("");

      var user = firebase.auth().currentUser;
      if (!user) {
        setProfileError("Session expirée, merci de vous reconnecter.");
        return;
      }

      var firstName = (els.profileFirstName.value || "").trim();
      var lastName = (els.profileLastName.value || "").trim();
      var birthDate = els.profileBirthDate.value || "";

      if (!firstName || !lastName || !birthDate) {
        setProfileError("Merci de renseigner votre prénom, votre nom et votre date de naissance.");
        return;
      }

      user.updateProfile({ displayName: firstName + " " + lastName })
        .then(function () {
          return saveUserProfile(user.uid, {
            firstName: firstName,
            lastName: lastName,
            birthDate: birthDate,
            email: user.email,
            createdAt: new Date().toISOString(),
          });
        })
        .then(function () { checkEmailVerification(user); })
        .catch(function (err) { setProfileError(translateAuthError(err)); });
    });

    els.overlay.querySelector("#mbf-btn-verify-check").addEventListener("click", function () {
      var user = firebase.auth().currentUser;
      if (!user) return;
      setVerifyError("");

      user.reload().then(function () {
        if (firebase.auth().currentUser.emailVerified) {
          goToStep(3);
        } else {
          setVerifyError("On y est presque... Votre adresse n'est pas encore confirmée. Vérifiez votre boite mail (et vos spams) et réessayez.");
        }
      });
    });

    els.overlay.querySelector("#mbf-btn-verify-resend").addEventListener("click", function () {
      var user = firebase.auth().currentUser;
      if (!user) return;
      setVerifyError("");

      user.sendEmailVerification()
        .then(function () { setVerifyError("Email renvoyé !"); })
        .catch(function (err) { setVerifyError(translateAuthError(err)); });
    });
  }

  function setAuthError(message) {
    if (els.authError) els.authError.textContent = message || "";
  }

  function setProfileError(message) {
    if (els.profileError) els.profileError.textContent = message || "";
  }

  function setVerifyError(message) {
    if (els.verifyError) els.verifyError.textContent = message || "";
  }

  function switchAuthPanel(name) {
    els.authPanels.forEach(function (panel) {
      panel.classList.toggle("is-active", panel.getAttribute("data-panel") === name);
    });
  }


  function checkEmailVerification(user) {
    setAuthError("");
    if (user.emailVerified) {
      goToStep(3);
      return;
    }
    if (els.verifyEmailLabel) els.verifyEmailLabel.textContent = user.email || "";
    user.sendEmailVerification().catch(function () { });
    switchAuthPanel("verify");
  }

  function translateAuthError(err) {
    var code = err && err.code;
    var map = {
      "auth/invalid-email": "Adresse email invalide.",
      "auth/user-disabled": "Ce compte a été désactivé en raison d'une violation des conditions d'utilisation.",
      "auth/user-not-found": "Aucun compte ne correspond à cet email...",
      "auth/wrong-password": "Mot de passe incorrect.",
      "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
      "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
      "auth/popup-closed-by-user": "La fenêtre Google a été fermée avant la fin de la connexion.",
      "auth/too-many-requests": "Trop de tentatives, merci de réessayer plus tard.",
      "auth/requires-recent-login": "Merci de vous reconnecter pour effectuer cette action.",
    };
    return (code && map[code]) || (err && err.message) || "Une erreur est survenue, merci de réessayer.";
  }

  function setStepInstant(index) {
    els.steps.forEach(function (step, i) {
      step.classList.toggle("is-active", i === index);
      step.classList.remove("is-leaving");
    });
    els.footers.forEach(function (footer, i) {
      footer.classList.toggle("is-active", i === index);
    });
    els.dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.classList.toggle("is-done", i < index);
    });
    els.headerIcon.innerHTML = HEADER_ICONS[index];
    els.headerTitle.textContent = HEADER_TITLES[index];
    if (els.body) els.body.scrollTop = 0;
    current = index;
  }

  function goToStep(index) {
    if (index === current || index < 0 || index >= els.steps.length) return;

    var outgoingStep = els.steps[current];
    var incomingStep = els.steps[index];
    var outgoingFooter = els.footers[current];
    var incomingFooter = els.footers[index];

    outgoingStep.classList.remove("is-active");
    outgoingStep.classList.add("is-leaving");
    outgoingFooter.classList.remove("is-active");
    els.headerIcon.style.opacity = 0;
    els.headerTitle.style.opacity = 0;

    window.setTimeout(function () {
      outgoingStep.classList.remove("is-leaving");
      incomingStep.classList.add("is-active");
      incomingFooter.classList.add("is-active");
      if (els.body) els.body.scrollTop = 0;

      els.headerIcon.innerHTML = HEADER_ICONS[index];
      els.headerTitle.textContent = HEADER_TITLES[index];
      els.headerIcon.style.opacity = 1;
      els.headerTitle.style.opacity = 1;

      var firstButton = incomingFooter.querySelector("button");
      if (firstButton) firstButton.focus();
    }, 180);

    els.dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.classList.toggle("is-done", i < index);
    });

    current = index;
  }

  function open() {
    injectStyles();
    injectMarkup();
    if (!isInjected) {
      cacheElements();
      bindEvents();
      isInjected = true;
    }
    setStepInstant(0);
    els.overlay.style.display = "flex";
    void els.overlay.offsetWidth;
    els.overlay.classList.add("mbf-is-open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!els.overlay) return;
    els.overlay.classList.remove("mbf-is-open");
    document.body.style.overflow = "";
    window.setTimeout(function () {
      if (els.overlay) els.overlay.style.display = "none";
    }, TRANSITION_MS);
    window.localStorage.setItem(`termsconds${window.BUILD_VERSION}`, "true");
  }

  window.MyBusFinderWelcome = { open: open, close: close };
})();
