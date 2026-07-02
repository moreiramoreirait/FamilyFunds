package com.familyfinance.entity;

/** Escopo ao categorizar um lançamento. */
public enum CategorizeScope {
    SINGLE,           // só este lançamento
    ALL_MATCHING,     // todos os lançamentos que contêm a palavra-chave (+ regra p/ futuros)
    THIS_AND_FUTURE   // este + regra p/ futuros (não altera os antigos)
}
