
(function () {
    "use strict";

    const API = "https://fr.wikipedia.org/w/api.php";

    function nettoyerTexte(html) {
        const element = document.createElement("div");
        element.innerHTML = html || "";
        return element.textContent || "";
    }

    function calculerPertinence(message, titre, extrait) {
        const mots = message
            .toLocaleLowerCase("fr")
            .match(/[\p{L}\p{N}]{3,}/gu) || [];

        const titreNormalise = titre.toLocaleLowerCase("fr");
        const extraitNormalise = extrait.toLocaleLowerCase("fr");

        const uniques = [...new Set(mots)];
        let score = 0;

        for (const mot of uniques) {
            if (titreNormalise.includes(mot)) score += 3;
            if (extraitNormalise.includes(mot)) score += 1;
        }

        return score;
    }

    async function rechercher(message, options = {}) {
        if (typeof message !== "string" || !message.trim()) {
            throw new Error("Le message est vide.");
        }

        const limite = Math.min(
            10,
            Math.max(1, Number(options.limite) || 5)
        );

        const params = new URLSearchParams({
            action: "query",
            generator: "search",
            gsrsearch: message.trim().slice(0, 500),
            gsrnamespace: "0",
            gsrlimit: String(limite),
            prop: "extracts|info",
            exintro: "1",
            explaintext: "1",
            exsentences: "5",
            inprop: "url",
            format: "json",
            formatversion: "2",
            origin: "*"
        });

        const controleur = new AbortController();
        const timeout = setTimeout(
            () => controleur.abort(),
            12000
        );

        try {
            const reponse = await fetch(
                API + "?" + params,
                { signal: controleur.signal }
            );

            if (!reponse.ok) {
                throw new Error("Wikimedia HTTP " + reponse.status);
            }

            const donnees = await reponse.json();

            const pages = donnees.query?.pages || [];

            const resultats = pages.map(page => {
                const extrait = nettoyerTexte(page.extract || "");

                return {
                    titre: page.title,
                    extrait,
                    url: page.fullurl,
                    pertinence: calculerPertinence(
                        message,
                        page.title,
                        extrait
                    )
                };
            });

            resultats.sort(
                (a, b) => b.pertinence - a.pertinence
            );

            return {
                source: "Wikipédia français",
                question: message,
                resultats,
                nombre: resultats.length,
                dateRecherche: new Date().toISOString()
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    window.DavidWikimedia = { rechercher };
})();
