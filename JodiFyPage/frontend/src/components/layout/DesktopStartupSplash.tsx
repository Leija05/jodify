import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSettingsStore } from '../../store/settings.store';
import { useSession } from '../../context/SessionContext';
import {
  STARTUP_SPLASH_STYLES,
  type StartupSplashStyle,
} from '../../lib/startupSplashStyles';

// Exact SVG Paths extracted from JodiFy Motion Graphic Identity
const P1_FACE =
  'M6075 9381 c-9 -10 -33 -21 -54 -25 -21 -3 -44 -13 -51 -21 -7 -8 -23 -15 -35 -15 -12 0 -34 -9 -48 -20 -14 -11 -36 -20 -49 -20 -12 0 -38 -9 -56 -20 -18 -11 -43 -20 -56 -20 -12 0 -31 -9 -41 -20 -10 -11 -30 -20 -45 -20 -15 0 -38 -8 -51 -19 -13 -10 -40 -21 -60 -25 -21 -4 -42 -13 -48 -20 -6 -7 -29 -16 -50 -20 -21 -3 -44 -12 -50 -20 -7 -8 -30 -17 -51 -21 -21 -4 -44 -13 -51 -21 -6 -8 -22 -14 -34 -14 -12 0 -33 -8 -46 -19 -13 -10 -40 -21 -60 -25 -21 -4 -42 -13 -49 -21 -7 -8 -25 -15 -40 -15 -15 0 -38 -8 -51 -19 -13 -10 -40 -21 -60 -25 -21 -4 -42 -13 -49 -21 -7 -8 -23 -15 -35 -15 -12 0 -34 -9 -48 -20 -14 -11 -36 -20 -49 -20 -13 0 -33 -7 -44 -15 -10 -8 -37 -20 -59 -26 -22 -6 -47 -17 -55 -24 -8 -7 -31 -15 -51 -19 -21 -4 -42 -13 -49 -20 -6 -8 -29 -17 -50 -21 -21 -4 -44 -13 -51 -21 -6 -8 -22 -14 -34 -14 -12 0 -33 -8 -46 -19 -13 -10 -41 -21 -63 -25 -41 -8 -49 -13 -102 -63 -23 -21 -34 -40 -34 -60 0 -15 -9 -41 -20 -58 -11 -16 -20 -43 -20 -59 0 -16 -7 -34 -16 -40 -8 -7 -18 -32 -21 -56 -3 -25 -14 -56 -24 -69 -11 -13 -19 -35 -19 -50 0 -14 -9 -39 -20 -56 -11 -16 -20 -41 -20 -54 0 -14 -7 -32 -15 -41 -9 -10 -19 -35 -22 -56 -3 -22 -12 -46 -20 -55 -8 -9 -17 -34 -20 -55 -3 -22 -14 -50 -25 -63 -10 -13 -18 -35 -18 -50 0 -14 -9 -39 -20 -56 -11 -16 -20 -43 -20 -59 0 -16 -7 -37 -15 -46 -9 -10 -19 -35 -22 -56 -3 -22 -14 -50 -25 -63 -10 -13 -18 -35 -18 -50 0 -14 -9 -39 -20 -56 -11 -16 -20 -41 -20 -54 0 -14 -7 -32 -15 -41 -9 -10 -19 -35 -22 -56 -3 -22 -12 -46 -20 -55 -8 -9 -17 -34 -20 -55 -3 -22 -12 -46 -20 -55 -8 -9 -17 -34 -20 -55 -3 -22 -12 -47 -20 -56 -8 -9 -17 -35 -20 -57 -3 -22 -12 -46 -19 -52 -8 -6 -14 -17 -14 -23 0 -10 -80 -180 -101 -216 -5 -8 -14 -26 -20 -40 -6 -14 -19 -42 -30 -62 -10 -20 -19 -45 -19 -55 0 -10 -9 -26 -20 -36 -11 -9 -20 -28 -20 -42 0 -14 -9 -34 -20 -45 -11 -11 -20 -29 -20 -40 0 -11 -9 -29 -20 -40 -11 -11 -20 -29 -20 -40 0 -11 -9 -29 -20 -40 -11 -11 -20 -28 -20 -38 0 -11 -9 -27 -20 -37 -11 -10 -20 -27 -20 -37 0 -11 -9 -31 -20 -45 -11 -14 -20 -36 -20 -48 0 -13 -6 -25 -14 -28 -8 -3 -17 -21 -21 -39 -4 -18 -16 -47 -26 -64 -10 -17 -19 -41 -19 -54 0 -12 -9 -33 -20 -47 -11 -14 -20 -35 -20 -47 0 -11 -9 -34 -20 -51 -11 -16 -20 -43 -20 -59 0 -16 -7 -37 -15 -46 -9 -10 -19 -40 -24 -68 -4 -28 -14 -58 -21 -66 -6 -9 -16 -42 -20 -73 -4 -32 -15 -76 -24 -98 -8 -22 -15 -67 -16 -101 0 -33 -8 -85 -17 -115 -16 -47 -18 -95 -18 -349 1 -254 3 -301 18 -339 9 -24 17 -71 17 -105 1 -33 8 -79 16 -101 9 -22 20 -66 24 -98 4 -32 15 -66 23 -75 8 -9 17 -39 20 -65 2 -26 12 -56 21 -66 9 -10 16 -31 16 -48 0 -17 9 -42 20 -56 11 -14 20 -36 20 -50 0 -13 8 -35 18 -48 11 -13 22 -37 26 -54 4 -16 13 -37 21 -45 7 -8 16 -25 20 -38 3 -12 22 -46 41 -75 19 -28 34 -57 34 -63 0 -6 9 -19 20 -29 11 -10 20 -23 20 -29 0 -13 51 -89 67 -99 7 -4 13 -15 13 -23 0 -22 191 -255 290 -355 90 -90 330 -289 349 -289 6 0 19 -8 29 -18 29 -27 75 -59 98 -66 12 -4 29 -15 39 -26 10 -11 26 -20 36 -20 10 0 20 -4 23 -9 8 -12 207 -111 224 -111 8 0 25 -9 39 -20 14 -11 37 -20 51 -20 14 0 33 -7 43 -16 10 -9 37 -18 61 -21 24 -3 50 -12 60 -20 9 -8 41 -18 71 -22 31 -4 63 -13 71 -21 9 -7 49 -15 89 -18 39 -2 86 -12 102 -20 66 -34 784 -34 850 0 17 8 63 18 103 20 47 4 79 11 91 22 10 9 35 16 57 16 21 0 54 9 72 20 18 11 44 20 59 20 14 0 40 8 57 19 17 10 47 21 67 25 21 4 42 13 49 21 7 8 23 15 35 15 12 0 34 9 48 20 14 11 32 20 40 20 8 0 26 9 40 20 14 11 32 20 41 20 9 0 24 9 33 20 10 11 24 20 32 20 8 0 39 17 70 38 31 20 63 42 73 47 9 6 37 25 63 43 25 17 49 32 53 32 4 0 36 27 72 60 36 33 68 60 72 60 17 0 263 242 283 279 11 21 68 90 101 124 11 12 31 40 44 62 13 22 38 58 56 80 17 22 35 51 39 65 4 14 16 31 26 38 11 7 19 22 19 32 0 10 4 21 10 25 5 3 24 36 42 73 17 37 40 78 50 91 10 13 18 33 18 43 0 11 9 31 20 45 11 14 20 37 20 51 0 14 7 33 15 42 9 10 19 35 22 56 3 22 12 47 21 56 8 9 17 39 19 65 3 26 12 55 19 64 8 9 18 45 23 80 5 35 16 82 25 104 8 22 15 69 16 103 0 35 8 89 18 120 14 48 17 98 17 322 0 212 -3 270 -14 290 -9 14 -18 70 -22 132 -5 72 -12 114 -23 130 -9 12 -16 43 -16 68 0 25 -7 59 -16 75 -9 17 -20 52 -25 79 -4 27 -15 56 -24 66 -8 9 -15 30 -15 47 0 17 -8 41 -19 54 -10 13 -21 40 -25 60 -4 21 -13 42 -21 49 -8 7 -15 23 -15 36 0 13 -9 33 -20 44 -11 11 -20 29 -20 40 0 11 -9 29 -20 40 -11 11 -20 29 -20 39 0 11 -7 27 -16 35 -9 9 -27 38 -41 64 -13 26 -33 56 -44 68 -10 11 -19 25 -19 31 0 6 -17 33 -38 60 -20 26 -51 68 -67 93 -17 24 -37 51 -45 60 -8 9 -49 54 -90 100 -94 105 -108 119 -259 260 -68 63 -133 125 -145 136 -11 12 -57 49 -101 83 -44 34 -107 88 -140 120 -33 31 -96 86 -140 121 -93 75 -54 38 -516 490 -200 195 -401 391 -446 435 l-84 80 18 45 c10 25 25 51 35 58 10 7 18 24 18 37 0 13 6 28 14 32 7 4 27 34 44 65 17 32 38 65 46 74 9 8 16 23 16 33 0 10 9 26 20 36 11 10 20 24 20 32 0 7 15 35 34 61 18 27 37 59 41 73 4 13 16 30 26 37 11 7 19 24 19 38 0 13 6 27 14 30 8 3 20 18 26 32 18 43 45 88 63 107 9 9 17 24 17 34 0 10 9 26 20 36 11 10 20 25 20 33 0 9 6 23 14 31 8 9 28 42 45 74 17 32 37 65 46 73 8 9 15 23 15 33 0 10 9 26 20 36 11 10 20 25 20 34 0 9 9 24 20 34 11 9 20 21 20 26 0 18 -29 19 -45 2z m1250 -3844 c7 -7 26 -24 41 -38 43 -36 108 -118 133 -166 11 -24 30 -61 41 -82 11 -22 20 -51 20 -64 0 -14 9 -44 20 -68 17 -39 20 -66 20 -237 0 -167 -3 -200 -20 -249 -11 -32 -20 -70 -20 -85 0 -16 -9 -45 -20 -65 -11 -21 -20 -46 -20 -56 0 -15 -20 -61 -52 -117 -5 -8 -14 -26 -21 -40 -37 -75 -149 -213 -225 -277 -31 -26 -59 -51 -62 -54 -3 -3 -30 -18 -60 -34 -30 -15 -73 -37 -95 -48 -35 -18 -58 -21 -192 -21 -131 0 -155 2 -171 18 -11 9 -32 21 -48 25 -15 4 -37 19 -48 34 -18 25 -19 28 -3 45 9 10 17 28 17 39 0 11 9 32 20 46 11 14 20 32 20 40 0 7 9 24 20 37 11 13 20 30 20 40 0 42 55 53 97 20 41 -32 120 -27 187 10 74 42 137 100 180 165 20 30 41 57 46 60 6 3 10 13 10 22 0 8 9 26 20 40 11 14 20 34 20 44 0 11 9 36 20 56 11 21 20 52 20 69 0 17 8 51 17 75 24 64 24 262 0 306 -9 18 -17 44 -17 58 0 25 -53 129 -71 141 -14 9 -10 42 10 82 10 20 29 60 41 87 13 28 27 57 32 65 12 21 25 52 32 73 6 20 22 22 41 4z m-3755 -287 c19 -7 54 -21 78 -31 101 -45 139 -63 174 -80 20 -11 44 -19 53 -19 9 0 28 -9 42 -20 14 -11 36 -20 49 -20 41 0 37 -19 -16 -77 -58 -64 -114 -145 -140 -203 -7 -14 -20 -42 -31 -62 -10 -20 -19 -46 -19 -56 0 -11 -9 -39 -20 -63 -17 -39 -20 -66 -20 -224 0 -158 3 -185 20 -224 11 -24 20 -52 20 -63 0 -10 9 -36 19 -56 11 -20 24 -48 31 -62 25 -57 81 -138 132 -190 52 -55 131 -120 145 -120 5 0 18 -9 28 -20 10 -11 25 -20 34 -20 9 0 27 -8 41 -17 13 -9 42 -20 64 -24 23 -4 59 -14 81 -23 61 -23 211 -21 275 4 28 11 63 20 79 20 16 0 40 9 54 20 14 11 30 20 37 20 7 0 23 9 37 20 14 11 31 20 37 20 14 0 159 140 193 185 40 53 73 106 73 116 0 6 9 22 20 36 11 14 20 34 20 45 0 10 9 36 20 58 11 22 20 55 20 75 0 20 7 75 17 121 13 70 14 94 5 135 -7 28 -10 55 -6 60 9 16 58 10 89 -11 17 -11 38 -20 48 -20 11 0 30 -9 44 -20 14 -11 35 -20 45 -20 11 0 31 -9 45 -20 14 -11 34 -20 45 -20 10 0 37 -9 59 -20 21 -11 57 -29 78 -40 22 -11 47 -20 55 -20 22 0 77 -50 90 -82 15 -35 -7 -197 -35 -250 -10 -20 -19 -45 -19 -55 0 -10 -9 -31 -20 -48 -11 -16 -20 -37 -20 -46 0 -9 -9 -28 -20 -42 -11 -14 -20 -32 -20 -40 0 -7 -9 -22 -20 -32 -11 -10 -20 -22 -20 -27 0 -18 -94 -141 -170 -221 -60 -65 -204 -188 -238 -204 -15 -7 -40 -22 -57 -32 -16 -11 -59 -34 -95 -51 -36 -17 -83 -40 -105 -51 -22 -10 -51 -19 -65 -19 -14 -1 -43 -9 -65 -20 -22 -11 -62 -20 -90 -20 -27 0 -92 -7 -142 -14 -80 -13 -106 -13 -185 0 -51 7 -115 14 -143 14 -28 0 -69 9 -94 20 -24 11 -54 20 -68 20 -13 0 -41 9 -61 19 -20 11 -73 36 -117 58 -44 21 -94 48 -113 61 -18 12 -35 22 -38 22 -13 0 -155 124 -214 187 -125 132 -184 211 -224 299 -8 17 -19 35 -25 38 -6 4 -11 16 -11 28 0 11 -9 31 -20 45 -11 14 -20 35 -20 47 0 11 -9 35 -20 51 -11 17 -20 42 -20 57 0 15 -9 50 -20 78 -11 28 -20 72 -20 98 0 26 -7 85 -15 132 -19 105 -19 153 0 255 8 44 15 105 15 135 0 32 9 73 20 99 11 24 20 54 20 67 0 13 9 41 20 61 11 21 20 46 20 56 0 10 9 30 20 44 11 14 20 35 20 47 0 34 62 118 105 142 43 25 85 26 145 4z';

const P2_HP_RIGHT =
  'M5886 8265 c-5 -13 6 -29 40 -59 25 -22 82 -81 126 -131 71 -79 190 -211 255 -281 12 -13 34 -41 50 -61 15 -21 34 -44 41 -51 6 -7 12 -18 12 -23 0 -5 6 -9 13 -9 7 0 28 -11 47 -25 19 -14 46 -25 61 -25 14 0 32 -7 39 -15 7 -8 28 -17 49 -21 20 -4 47 -15 60 -25 13 -11 33 -19 45 -19 12 0 29 -9 39 -20 9 -11 27 -20 40 -20 12 0 30 -9 40 -20 9 -11 26 -20 36 -20 11 0 22 -4 25 -9 6 -8 84 -56 166 -102 16 -9 46 -29 67 -45 21 -16 59 -43 85 -60 27 -17 65 -45 86 -62 20 -17 64 -52 97 -78 86 -68 367 -351 399 -402 15 -24 40 -58 56 -75 16 -18 36 -39 43 -47 8 -8 26 -36 41 -63 16 -26 33 -50 39 -55 19 -11 57 -70 57 -86 0 -8 8 -21 18 -28 9 -7 30 -38 46 -68 16 -30 35 -62 42 -71 8 -8 14 -23 14 -32 0 -10 9 -25 20 -34 11 -10 20 -27 20 -39 0 -11 9 -29 20 -39 12 -11 20 -31 20 -50 0 -31 -2 -32 -48 -38 -55 -6 -112 -50 -112 -86 0 -12 -5 -30 -12 -41 -10 -15 -10 -26 0 -53 7 -18 12 -51 12 -72 0 -21 9 -57 19 -79 10 -23 21 -65 25 -95 3 -29 12 -64 21 -77 8 -13 15 -42 15 -65 0 -24 9 -61 19 -83 10 -23 21 -69 24 -102 3 -34 12 -72 20 -85 10 -16 17 -64 21 -141 3 -64 11 -129 18 -145 17 -41 17 -354 -1 -421 -7 -29 -17 -99 -21 -155 -4 -56 -15 -120 -23 -142 -9 -22 -16 -59 -17 -83 0 -23 -9 -59 -20 -79 -11 -21 -20 -56 -20 -78 0 -22 -7 -51 -16 -63 -8 -12 -18 -48 -21 -80 -3 -31 -14 -73 -25 -92 -10 -19 -18 -52 -18 -73 0 -21 -7 -51 -15 -67 -14 -26 -13 -33 2 -73 27 -67 57 -98 104 -108 54 -12 127 -1 150 22 11 11 25 19 33 19 7 0 25 9 38 20 14 11 36 24 49 30 13 6 42 21 64 35 22 13 54 30 71 38 17 8 35 20 38 26 4 6 15 11 25 11 10 0 26 9 36 20 10 11 27 22 38 26 12 4 42 22 69 40 26 19 52 34 57 34 6 0 23 11 38 25 50 44 56 49 120 97 69 52 144 129 186 191 15 23 31 44 35 47 14 10 62 86 62 98 0 7 9 21 20 32 11 11 20 30 20 42 0 12 7 29 15 38 9 10 19 40 24 68 4 28 14 59 22 68 11 14 14 69 14 278 0 230 -2 265 -17 293 -10 18 -18 49 -18 70 0 21 -9 56 -20 78 -11 22 -20 51 -20 66 0 14 -9 38 -20 52 -11 14 -20 36 -20 50 0 13 -9 36 -20 50 -11 14 -20 34 -20 45 0 10 -8 30 -19 43 -10 13 -21 34 -25 46 -4 11 -13 27 -21 33 -8 7 -15 21 -15 31 0 10 -8 24 -17 31 -10 7 -22 20 -28 29 -60 96 -109 149 -175 194 -68 45 -100 78 -100 101 0 12 -8 32 -18 45 -11 13 -22 41 -25 63 -3 21 -13 46 -20 55 -8 9 -17 32 -21 52 -4 21 -13 42 -20 48 -8 7 -17 27 -20 45 -4 19 -13 39 -21 46 -8 7 -15 20 -15 30 0 9 -9 29 -20 43 -11 14 -20 32 -20 40 0 8 -9 25 -19 39 -11 13 -23 37 -26 51 -4 15 -11 30 -16 33 -5 3 -16 20 -25 37 -30 64 -47 92 -61 100 -7 4 -13 16 -13 27 0 10 -7 26 -16 35 -23 22 -64 84 -64 95 0 8 -21 35 -63 80 -8 8 -17 24 -21 35 -3 12 -23 40 -44 63 -20 23 -45 52 -55 64 -9 13 -38 50 -64 83 -63 82 -354 374 -426 427 -32 24 -77 60 -100 81 -23 20 -73 59 -112 85 -38 26 -78 55 -87 65 -10 9 -23 17 -28 17 -6 0 -33 16 -61 35 -27 20 -61 40 -75 45 -13 5 -24 14 -24 19 0 5 -12 14 -27 20 -28 11 -47 21 -94 53 -15 9 -39 20 -53 24 -14 3 -30 12 -36 19 -6 8 -24 17 -40 20 -16 3 -34 12 -40 20 -6 8 -26 17 -43 21 -18 3 -43 15 -56 25 -13 11 -35 19 -48 19 -14 0 -36 9 -50 20 -14 11 -34 20 -44 20 -11 0 -36 9 -56 20 -21 11 -49 20 -62 20 -13 0 -32 7 -42 16 -10 9 -40 19 -66 21 -26 3 -55 12 -64 20 -10 8 -43 17 -75 20 -33 3 -69 12 -82 20 -13 8 -58 18 -101 22 -42 5 -87 14 -100 20 -12 7 -55 15 -95 18 -63 5 -74 3 -80 -12z';

const P3_HP_LEFT =
  'M3480 7712 c-8 -2 -33 -19 -55 -36 -22 -17 -60 -45 -85 -61 -25 -17 -49 -35 -55 -41 -5 -6 -59 -50 -120 -99 -143 -115 -363 -333 -465 -461 -44 -56 -91 -113 -103 -126 -12 -13 -35 -44 -52 -69 -16 -24 -47 -66 -67 -92 -21 -27 -38 -54 -38 -61 0 -7 -8 -20 -17 -29 -10 -9 -29 -37 -43 -64 -14 -26 -33 -54 -42 -61 -10 -7 -18 -24 -18 -37 0 -13 -6 -28 -13 -32 -7 -4 -22 -26 -33 -48 -11 -22 -41 -80 -67 -128 -26 -48 -47 -94 -47 -101 0 -8 -7 -19 -15 -26 -8 -7 -18 -30 -21 -51 -4 -21 -15 -46 -25 -55 -11 -9 -19 -28 -19 -42 0 -14 -7 -33 -15 -42 -9 -10 -19 -35 -22 -56 -3 -22 -12 -46 -20 -55 -7 -9 -17 -35 -21 -59 -5 -28 -14 -47 -27 -53 -11 -6 -25 -13 -31 -16 -7 -3 -33 -21 -58 -38 -26 -18 -50 -33 -55 -33 -13 0 -181 -181 -181 -195 0 -7 -10 -26 -22 -42 -31 -38 -42 -57 -78 -133 -17 -36 -40 -82 -51 -102 -10 -20 -19 -47 -19 -58 0 -12 -9 -33 -20 -47 -11 -14 -20 -39 -20 -54 0 -16 -9 -46 -20 -66 -11 -21 -20 -57 -20 -81 0 -24 -8 -57 -17 -75 -27 -48 -32 -441 -8 -507 9 -25 20 -66 24 -92 4 -26 15 -56 24 -66 9 -10 17 -26 17 -34 0 -21 51 -121 67 -131 7 -4 13 -14 13 -22 0 -41 317 -365 357 -365 7 0 21 -8 31 -18 29 -27 75 -59 98 -66 12 -4 29 -15 39 -26 10 -11 26 -20 35 -20 10 0 22 -6 28 -13 6 -6 40 -27 76 -46 36 -18 66 -38 66 -42 0 -5 9 -9 19 -9 11 0 33 -11 49 -25 17 -14 37 -25 45 -25 8 0 20 -7 27 -15 6 -8 21 -17 33 -21 12 -4 34 -16 49 -27 39 -29 133 -20 172 16 58 54 82 140 51 181 -8 11 -15 38 -15 60 0 22 -9 58 -19 80 -10 23 -21 65 -24 94 -2 29 -11 60 -21 70 -10 11 -16 36 -16 62 0 24 -9 62 -19 84 -10 23 -21 68 -24 102 -3 33 -12 75 -21 92 -9 18 -16 55 -16 89 0 32 -7 113 -15 178 -18 149 -19 227 0 380 8 66 15 149 15 185 0 40 6 77 16 95 9 17 18 57 21 90 2 33 13 81 24 107 10 26 19 62 19 81 0 19 9 54 20 78 11 24 20 62 20 84 0 23 9 58 20 80 11 22 20 57 20 80 1 22 7 51 15 65 21 36 18 62 -10 113 -32 56 -41 63 -106 87 -46 15 -55 23 -57 46 -2 16 2 31 11 36 8 4 18 20 22 35 3 16 12 35 20 43 7 8 16 26 20 40 4 14 16 36 26 49 11 13 19 30 19 37 0 8 9 23 20 34 11 11 20 29 20 40 0 10 6 23 13 27 16 10 57 69 57 82 0 5 11 22 23 38 13 15 36 48 50 73 14 25 39 59 56 77 16 17 39 47 52 65 28 40 104 128 198 228 39 41 71 79 71 83 0 5 9 20 20 34 11 14 20 37 20 52 0 14 9 40 20 56 11 17 20 44 20 62 0 19 7 36 16 41 9 5 18 28 21 53 3 24 14 55 24 68 11 13 19 37 19 54 0 17 7 38 15 47 9 10 19 35 22 56 3 22 12 46 20 55 8 9 17 34 20 55 4 22 15 53 25 69 10 17 18 41 18 54 0 14 8 33 17 43 18 20 8 39 -17 30z';

/**
 * Web Audio Synthesizer with spatial stereo acoustics tailored to each style.
 */
function playStartupSynthChime(style: StartupSplashStyle) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    switch (style) {
      case 'vinyl_groove': {
        // 1. Vinyl needle drop thump & realistic micro crackle
        const bufferSize = Math.floor(ctx.sampleRate * 1.3);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = Math.random() > 0.997 ? (Math.random() > 0.5 ? 0.45 : -0.45) : white * 0.035;
        }
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        const bpf = ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(1600, now);
        bpf.Q.setValueAtTime(1.4, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.09, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
        noiseNode.connect(bpf);
        bpf.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseNode.start(now);

        // 2. Warm vinyl acoustic sub thump
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(58, now);
        sub.frequency.exponentialRampToValueAtTime(38, now + 1.6);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.35, now + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 1.9);

        // 3. Warm Solfeggio Rhodes chord (Ebmaj9: 311Hz, 392Hz, 466Hz, 587Hz, 784Hz)
        setTimeout(() => {
          try {
            const t = ctx.currentTime;
            [311.13, 392.0, 466.16, 587.33, 783.99].forEach((f, i) => {
              const osc = ctx.createOscillator();
              const g = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(f, t);
              g.gain.setValueAtTime(0, t);
              g.gain.linearRampToValueAtTime(0.12 / (i + 1), t + 0.08);
              g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
              osc.connect(g);
              g.connect(ctx.destination);
              osc.start(t);
              osc.stop(t + 1.7);
            });
          } catch {
            /* ignore */
          }
        }, 1350);
        break;
      }

      case 'aurora_cosmic': {
        // 1. Dual detuned celestial shimmer drone (acoustic chorus beating)
        [110, 110.65].forEach((f) => {
          const drone = ctx.createOscillator();
          const dGain = ctx.createGain();
          drone.type = 'sine';
          drone.frequency.setValueAtTime(f, now);
          drone.frequency.exponentialRampToValueAtTime(f * 2, now + 2.1);
          dGain.gain.setValueAtTime(0, now);
          dGain.gain.linearRampToValueAtTime(0.14, now + 0.8);
          dGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
          drone.connect(dGain);
          dGain.connect(ctx.destination);
          drone.start(now);
          drone.stop(now + 2.6);
        });

        // 2. High crystal celestial bells at supernova peak (1.55s)
        setTimeout(() => {
          try {
            const t = ctx.currentTime;
            [528, 792, 1056, 1320, 1584].forEach((f, i) => {
              const osc = ctx.createOscillator();
              const g = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(f, t + i * 0.04);
              g.gain.setValueAtTime(0, t + i * 0.04);
              g.gain.linearRampToValueAtTime(0.08 / (i + 1), t + i * 0.04 + 0.03);
              g.gain.exponentialRampToValueAtTime(0.00001, t + i * 0.04 + 1.8);
              osc.connect(g);
              g.connect(ctx.destination);
              osc.start(t + i * 0.04);
              osc.stop(t + i * 0.04 + 1.9);
            });
          } catch {
            /* ignore */
          }
        }, 1500);
        break;
      }

      case 'sonic_shockwave': {
        // 1. Punchy Transient Attack (Kick punch)
        const punch = ctx.createOscillator();
        const punchGain = ctx.createGain();
        punch.type = 'sine';
        punch.frequency.setValueAtTime(280, now);
        punch.frequency.exponentialRampToValueAtTime(42, now + 0.08);
        punchGain.gain.setValueAtTime(0.48, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        punch.connect(punchGain);
        punchGain.connect(ctx.destination);
        punch.start(now);
        punch.stop(now + 0.15);

        // 2. Heavy 808 Sub-bass drop
        const sub808 = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub808.type = 'sine';
        sub808.frequency.setValueAtTime(85, now + 0.04);
        sub808.frequency.exponentialRampToValueAtTime(32, now + 1.8);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.44, now + 0.09);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        sub808.connect(subGain);
        subGain.connect(ctx.destination);
        sub808.start(now + 0.04);
        sub808.stop(now + 2.1);

        // 3. Secondary shockwave resonant detonation at 1.75s
        setTimeout(() => {
          try {
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, t);
            osc.frequency.exponentialRampToValueAtTime(48, t + 0.8);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.9);
          } catch {
            /* ignore */
          }
        }, 1750);
        break;
      }

      case 'studio_minimal': {
        // High-precision Swiss reference dual-pip chime
        [880, 1760].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.09 / (i + 1), now + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.38);
        });

        // Crisp studio sub click & 50Hz calibration pulse at 1.25s
        setTimeout(() => {
          try {
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(48, t + 0.5);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.6);
          } catch {
            /* ignore */
          }
        }, 1250);
        break;
      }

      case 'cyber_neon':
      default: {
        // Sub-bass glide (75Hz -> 42Hz)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(75, now);
        subOsc.frequency.exponentialRampToValueAtTime(42, now + 1.5);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.35, now + 0.08);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 1.8);

        // Neon harmonic chime arpeggio (432Hz, 540Hz, 648Hz, 864Hz, 1080Hz)
        setTimeout(() => {
          try {
            const chimeNow = ctx.currentTime;
            [432, 540, 648, 864, 1080].forEach((freq, idx) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, chimeNow + idx * 0.04);
              gain.gain.setValueAtTime(0, chimeNow + idx * 0.04);
              gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), chimeNow + idx * 0.04 + 0.04);
              gain.gain.exponentialRampToValueAtTime(0.0001, chimeNow + idx * 0.04 + 1.3);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(chimeNow + idx * 0.04);
              osc.stop(chimeNow + idx * 0.04 + 1.35);
            });
          } catch {
            /* ignore */
          }
        }, 1250);
        break;
      }
    }
  } catch {
    /* Silent catch for environments with strict autoplay policies */
  }
}

export function DesktopStartupSplash() {
  const desktopStartupAnimation = useSettingsStore((s) => s.desktopStartupAnimation);
  const activeSettingStyle = useSettingsStore((s) => s.startupSplashStyle) || 'cyber_neon';
  const { ready } = useSession();
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined' || isTest) return false;
    const alreadySeen = sessionStorage.getItem('jodify:desktop_splash_seen') === 'true';
    return Boolean(desktopStartupAnimation && !alreadySeen);
  });

  const [currentStyle, setCurrentStyle] = useState<StartupSplashStyle>(activeSettingStyle);
  const [pulsing, setPulsing] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [flash, setFlash] = useState(false);
  const [stageRumble, setStageRumble] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const minTimePassedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setVisible(false);
    try {
      sessionStorage.setItem('jodify:desktop_splash_seen', 'true');
    } catch {}
  }, [clearTimers]);

  const startAnimationSequence = useCallback(
    (requestedStyle?: StartupSplashStyle) => {
      clearTimers();
      const styleToPlay = requestedStyle || activeSettingStyle;
      setCurrentStyle(styleToPlay);
      setPulsing(false);
      setAssembled(false);
      setFlash(false);
      setStageRumble(false);
      minTimePassedRef.current = false;
      setAnimKey((k) => k + 1);
      setVisible(true);

      // 1. Play tailored spatial audio synthesis
      playStartupSynthChime(styleToPlay);

      // 2. Magnetic collision flash at 1050ms
      const tFlash = window.setTimeout(() => {
        setFlash(true);
      }, 1050);
      timersRef.current.push(tFlash);

      // 3. Sonic shockwave rumble at 1750ms
      if (styleToPlay === 'sonic_shockwave') {
        const tRumble = window.setTimeout(() => {
          setStageRumble(true);
        }, 1750);
        timersRef.current.push(tRumble);
      }

      // 4. Climax pulse at 1950ms
      const tPulse = window.setTimeout(() => {
        setPulsing(true);
      }, 1950);
      timersRef.current.push(tPulse);

      // 5. Assembled transition right after the eye ignition and blink finish (2350ms)
      const tAssembled = window.setTimeout(() => {
        setAssembled(true);
      }, 2350);
      timersRef.current.push(tAssembled);

      // 6. Minimum cinematic completion at 3800ms
      const tMin = window.setTimeout(() => {
        minTimePassedRef.current = true;
        // If the session & app in the background are already ready, dismiss seamlessly!
        if (readyRef.current) {
          dismiss();
        }
      }, 3800);
      timersRef.current.push(tMin);

      // 7. Maximum fail-safe timeout at 7500ms
      const tMax = window.setTimeout(() => {
        dismiss();
      }, 7500);
      timersRef.current.push(tMax);
    },
    [clearTimers, dismiss, activeSettingStyle]
  );

  // When session becomes ready, if the minimum intro time has already elapsed, dismiss immediately
  useEffect(() => {
    if (ready && visible && minTimePassedRef.current) {
      dismiss();
    }
  }, [ready, visible, dismiss]);

  // Initial mount trigger
  useEffect(() => {
    if (isTest) return;

    const alreadySeen = sessionStorage.getItem('jodify:desktop_splash_seen') === 'true';

    if (desktopStartupAnimation && !alreadySeen) {
      startAnimationSequence(activeSettingStyle);
    }

    // Manual preview listener from Settings Modal
    const handleManualTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ style?: StartupSplashStyle } | undefined>;
      const styleOverride = customEvent.detail?.style;
      startAnimationSequence(styleOverride);
    };

    window.addEventListener('jodify:play-startup-animation', handleManualTrigger);

    // Escape key listener to skip intro instantly
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimers();
      window.removeEventListener('jodify:play-startup-animation', handleManualTrigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [desktopStartupAnimation, startAnimationSequence, dismiss, clearTimers, activeSettingStyle, isTest]);

  const styleMeta =
    STARTUP_SPLASH_STYLES.find((s) => s.id === currentStyle) || STARTUP_SPLASH_STYLES[0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`startup-splash-${animKey}`}
          className={`jf-startup-overlay jf-splash-theme--${currentStyle}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.08,
            filter: 'blur(20px)',
            transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] },
          }}
          onClick={dismiss}
        >
          {/* Ambient Lighting & Dynamic Theme Backdrop */}
          <div className="jf-startup-backdrop" aria-hidden="true">
            {/* Ambient Breathing Orbs */}
            <div className="jf-startup-glow jf-startup-glow--primary" />
            <div className="jf-startup-glow jf-startup-glow--secondary" />

            {/* Ambient Floating Micro-Particles */}
            <div className="jf-splash-particles">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="jf-splash-particle"
                  style={{
                    left: `${(i * 7.1 + 3) % 96}%`,
                    top: `${(i * 12.3 + 8) % 88}%`,
                    animationDelay: `${(i * 0.22).toFixed(2)}s`,
                    background: i % 2 === 0 ? styleMeta.accent : styleMeta.secondary,
                    boxShadow: `0 0 10px ${styleMeta.accent}`,
                  }}
                />
              ))}
            </div>

            {/* Theme 1: Cyber Neon */}
            {currentStyle === 'cyber_neon' && (
              <>
                <div className="jf-splash-cyber-grid-3d" />
                <div className="jf-splash-laser-scanner" />
                <div className="jf-startup-sonic-ring jf-startup-sonic-ring--1" />
                <div className="jf-startup-sonic-ring jf-startup-sonic-ring--2" />
                <div className="jf-startup-sonic-ring jf-startup-sonic-ring--3" />
              </>
            )}

            {/* Theme 2: Vinyl Hi-Fi 3D */}
            {currentStyle === 'vinyl_groove' && (
              <div className="jf-splash-vinyl-turntable">
                <div className="jf-splash-vinyl-disc">
                  <div className="jf-splash-vinyl-grooves" />
                  <div className="jf-splash-vinyl-reflection" />
                  <div className="jf-splash-vinyl-label-rim" />
                  <div className="jf-splash-vinyl-spindle" />
                </div>
                <div className="jf-splash-tonearm" />
              </div>
            )}

            {/* Theme 3: Aurora Cosmic */}
            {currentStyle === 'aurora_cosmic' && (
              <div className="jf-splash-cosmic-wrap">
                <div className="jf-splash-stars-deep" />
                <div className="jf-splash-aurora-ribbon jf-splash-aurora--1" />
                <div className="jf-splash-aurora-ribbon jf-splash-aurora--2" />
                <div className="jf-splash-aurora-ribbon jf-splash-aurora--3" />
                <div className="jf-splash-supernova-flare" />
              </div>
            )}

            {/* Theme 4: Sonic Shockwave */}
            {currentStyle === 'sonic_shockwave' && (
              <div className="jf-splash-shockwave-wrap">
                <div className="jf-splash-oscilloscope-ring" />
                <div className="jf-splash-bass-ripple jf-splash-bass-ripple--1" />
                <div className="jf-splash-bass-ripple jf-splash-bass-ripple--2" />
                <div className="jf-splash-bass-ripple jf-splash-bass-ripple--3" />
              </div>
            )}

            {/* Theme 5: Studio Minimal */}
            {currentStyle === 'studio_minimal' && (
              <div className="jf-splash-studio-wrap">
                <div className="jf-splash-crosshair jf-splash-ch--tl">+</div>
                <div className="jf-splash-crosshair jf-splash-ch--tr">+</div>
                <div className="jf-splash-crosshair jf-splash-ch--bl">+</div>
                <div className="jf-splash-crosshair jf-splash-ch--br">+</div>
                <div className="jf-splash-studio-spec">
                  DSP 192kHz / 64-BIT FLOAT • REFERENCE GRADE ENGINE
                </div>

                {/* Left Dynamic VU Peak Meter */}
                <div className="jf-splash-vu-container jf-splash-vu--left">
                  <div className="jf-splash-vu-segment is-active-red is-dancing-peak" />
                  <div className="jf-splash-vu-segment is-active-yellow is-dancing-2" />
                  <div className="jf-splash-vu-segment is-active-yellow is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-3" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-2" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-3" />
                </div>

                {/* Right Dynamic VU Peak Meter */}
                <div className="jf-splash-vu-container jf-splash-vu--right">
                  <div className="jf-splash-vu-segment is-active-red is-dancing-peak" />
                  <div className="jf-splash-vu-segment is-active-yellow is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-yellow is-dancing-2" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-3" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-2" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-1" />
                  <div className="jf-splash-vu-segment is-active-green is-dancing-2" />
                </div>
              </div>
            )}
          </div>

          {/* Top Skip Button */}
          <button
            type="button"
            className="jf-startup-skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              dismiss();
            }}
            title="Saltar intro (Escape)"
          >
            <span>Saltar • Esc</span>
          </button>

          {/* Central Animated Construction */}
          <div className={`jf-startup-stage ${stageRumble ? 'is-rumbling' : ''}`}>
            <div
              className={`jf-startup-logo-wrap ${pulsing ? 'is-pulsing' : ''} ${
                assembled ? 'is-assembled' : ''
              }`}
            >
              <svg className="jf-startup-svg" viewBox="0 0 1024 1024">
                <defs>
                  {/* Neon Body Flame Gradient (Theme Responsive) */}
                  <linearGradient id="splash-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={styleMeta.accent} />
                    <stop offset="55%" stopColor={styleMeta.secondary} />
                    <stop offset="100%" stopColor="#2c0645" />
                  </linearGradient>

                  {/* High-Fidelity Headphone Arc Gradient */}
                  <linearGradient id="splash-hp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={styleMeta.secondary} />
                    <stop offset="60%" stopColor={styleMeta.accent} />
                    <stop offset="100%" stopColor="#120224" />
                  </linearGradient>

                  {/* Electric Laser Outline Trace Gradient */}
                  <linearGradient id="splash-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor={styleMeta.accent} />
                    <stop offset="100%" stopColor={styleMeta.secondary} />
                  </linearGradient>

                  {/* Electric Neon Green Eye Glow */}
                  <filter id="splash-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="20" floodColor="#00FF88" floodOpacity="0.95" />
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffffff" floodOpacity="0.9" />
                  </filter>

                  {/* Cinematic Neon Bloom Filter */}
                  <filter id="splash-neon-bloom" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <g transform="translate(0,1024) scale(0.1,-0.1)">
                  {/* Part 1: Left Headphone Arc (Stroke Laser Draw + Filled Body) */}
                  <path
                    className="jf-part-hp-left"
                    fill="url(#splash-hp-grad)"
                    d={P3_HP_LEFT}
                    filter="drop-shadow(0 0 24px rgba(0, 240, 255, 0.65))"
                  />
                  <path
                    className="jf-part-hp-left jf-stroke-draw-left"
                    fill="none"
                    stroke="url(#splash-stroke-grad)"
                    strokeWidth="60"
                    strokeLinecap="round"
                    d={P3_HP_LEFT}
                  />

                  {/* Part 2: Right Headphone Arc (Stroke Laser Draw + Filled Body) */}
                  <path
                    className="jf-part-hp-right"
                    fill="url(#splash-hp-grad)"
                    d={P2_HP_RIGHT}
                    filter="drop-shadow(0 0 24px rgba(168, 50, 232, 0.65))"
                  />
                  <path
                    className="jf-part-hp-right jf-stroke-draw-right"
                    fill="none"
                    stroke="url(#splash-stroke-grad)"
                    strokeWidth="60"
                    strokeLinecap="round"
                    d={P2_HP_RIGHT}
                  />

                  {/* Part 3: Glowing Neon Green Crescent Eyes behind flame cutouts */}
                  <g className="jf-part-eyes">
                    <ellipse cx="4500" cy="4200" rx="1000" ry="1000" fill="#00FF88" filter="url(#splash-eye-glow)" />
                    <circle cx="4500" cy="4200" r="420" fill="#ffffff" opacity="0.95" />
                    <ellipse cx="6400" cy="4800" rx="950" ry="1200" fill="#00FF88" filter="url(#splash-eye-glow)" />
                    <circle cx="6400" cy="4800" r="400" fill="#ffffff" opacity="0.95" />
                  </g>

                  {/* Part 4: Central Flame Droplet Head (Squash/Stretch with Laser Outline) */}
                  <path
                    className="jf-part-face"
                    fill="url(#splash-body-grad)"
                    d={P1_FACE}
                    filter="drop-shadow(0 0 42px rgba(168, 50, 232, 0.88))"
                  />
                  <path
                    className="jf-part-face jf-stroke-draw-face"
                    fill="none"
                    stroke="url(#splash-stroke-grad)"
                    strokeWidth="70"
                    strokeLinecap="round"
                    d={P1_FACE}
                  />
                </g>
              </svg>

              {/* Central Magnetic Connection Flash */}
              {flash && <div className="jf-splash-magnetic-flash" />}

              {/* Holographic Surface Sheen Reflection */}
              <div className="jf-splash-sheen-overlay" />
            </div>

            {/* Bilateral 24-Band Reactive Audio Spectrum Visualizer */}
            <div className="jf-startup-eq-row" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="jf-startup-eq-bar"
                  style={{
                    background: `linear-gradient(180deg, ${styleMeta.accent} 0%, ${styleMeta.secondary} 100%)`,
                    boxShadow: `0 0 14px ${styleMeta.accent}aa`,
                  }}
                />
              ))}
            </div>

            {/* Master Brand Typography Reveal */}
            <div className="jf-startup-typography">
              <h1 className="jf-startup-title">JODIFY</h1>
              <div className="jf-startup-badge">
                <span className="jf-startup-badge-dot" style={{ background: styleMeta.accent }} />
                <span>{styleMeta.tagline}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
