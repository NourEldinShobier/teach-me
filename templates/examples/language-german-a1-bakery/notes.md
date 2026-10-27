# German A1: Beim Bäcker

Win: order seven bakery items with the right article; only masculine changes after "Ich möchte" (accusative).

Verification (fetched 2026-10-27):
- de.wiktionary raw wikitext: Brötchen n./pl. Brötchen; Brezel f./Brezeln; Kuchen m./Kuchen; Brot n./Brote; Torte f./Torten; Kaffee m./Kaffees; Croissant n./Croissants; Plätzchen n./Plätzchen.
- DWDS page titles agree. Differences: Croissant is "das oder der" in DWDS (lesson uses das, callout says so); Wiktionary lists regional neuter Brezel and Kaffee (callout).
- en.wiktionary: "einen" = accusative masculine singular of ein; -chen words are always neuter.

Design: one sim (counter) driven by model(item, sentence): gender -> DEF/INDEF tables; drawing, tags, bubble, chips and hint read it. Items drawn as SVG (7 foods, awning, shelf, clock, lamp, trays). Dialogue prices are invented. The sim sits behind the predict reveal, so default screenshots do not show it.
