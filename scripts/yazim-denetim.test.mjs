#!/usr/bin/env node
/**
 * yazim-denetim.mjs testleri. Bağımlılık yok, node:test ile koşar.
 *   node --test scripts/yazim-denetim.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { tireHatalari, buyukHarfUyarilari, metinAlanlari, dosyaDenetle } from "./yazim-denetim.mjs";

test("em-dash hata üretir", () => {
  assert.equal(tireHatalari("kural — yasak", "t").length, 1);
});

test("yatay çubuk da hata üretir", () => {
  assert.equal(tireHatalari("kural ― yasak", "t").length, 1);
});

test("en dash meşrudur, hata üretmez", () => {
  assert.equal(tireHatalari("2020–2024 dönemi", "t").length, 0);
});

test("temiz metin hata üretmez", () => {
  assert.equal(tireHatalari("Sunum değil, çalışan sistem.", "t").length, 0);
});

test("TÜRKIYE uyarı üretir ve TÜRKİYE önerir", () => {
  const u = buyukHarfUyarilari("TÜRKIYE", "t");
  assert.equal(u.length, 1);
  assert.ok(u[0].includes("TÜRKİYE"));
});

test("BÖLELIM uyarı üretir", () => {
  assert.equal(buyukHarfUyarilari("HADI BÖLELIM", "t").length, 1);
});

test("ÇALIŞTIRIN yanlış pozitif değildir", () => {
  assert.equal(buyukHarfUyarilari("ÇALIŞTIRIN", "t").length, 0);
});

test("kısaltmalar muaftır", () => {
  assert.equal(buyukHarfUyarilari("AI ITIL API ISO IT", "t").length, 0);
});

test("BILGI kontrolün bilinen sınırıdır, yakalanmaz", () => {
  assert.equal(buyukHarfUyarilari("BILGI", "t").length, 0);
});

test("küçük harfli metin taranmaz", () => {
  assert.equal(buyukHarfUyarilari("Türkiye ve bilgi", "t").length, 0);
});

test("metin alanları kanal şemalarını kapsar", () => {
  const alanlar = metinAlanlari({
    tweets: ["bir", "iki"],
    text: "linkedin",
    caption: "instagram",
    images: [{ url: "a.jpg", altText: "kart" }],
  });
  assert.deepEqual(
    alanlar.map(([ad]) => ad),
    ["tweet 1", "tweet 2", "text", "caption", "images[0].altText"]
  );
});

test("dosya denetimi kirli kaydı yakalar", () => {
  const dizin = fs.mkdtempSync(path.join(os.tmpdir(), "yd-"));
  const dosya = path.join(dizin, "2026-08-27-ornek.json");
  fs.writeFileSync(
    dosya,
    JSON.stringify({ caption: "Yayın — TÜRKIYE", status: "ready" })
  );
  const { hatalar, uyarilar } = dosyaDenetle(dosya);
  assert.equal(hatalar.length, 1);
  assert.equal(uyarilar.length, 1);
  fs.rmSync(dizin, { recursive: true, force: true });
});

test("bozuk JSON hata olarak raporlanır", () => {
  const dizin = fs.mkdtempSync(path.join(os.tmpdir(), "yd-"));
  const dosya = path.join(dizin, "bozuk.json");
  fs.writeFileSync(dosya, "{ bu json değil");
  const { hatalar } = dosyaDenetle(dosya);
  assert.equal(hatalar.length, 1);
  fs.rmSync(dizin, { recursive: true, force: true });
});
