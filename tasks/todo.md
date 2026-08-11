# ver2 ゲーム追加 TODO（ブランチ: claude/fable5-game-ver2-oyyxbu）

計画本体: /root/.claude/plans/fable5-ver2-peaceful-storm.md（承認済み）

- [x] js/game-core-v2.js（共通基盤: SoundManagerV2 + GameV2ハーネス + roundRectポリフィル）
- [x] sparkle-fish-v2（きらきらさかな ver2）
- [x] fruit-catch-v2（フルーツキャッチ ver2）
- [x] alien-smash-v2（エイリアンたおし ver2）
- [x] balloon-pop-v2（ふうせんポン ver2）
- [x] whack-mole-v2（もぐらたたき ver2）
- [x] touch-sparkle-v2（タッチでキラキラ ver2）
- [x] fly-swatter-v2（ハエたたき ver2）
- [x] free-draw-v2（おえかき ver2）
- [x] light-button-v2（ひかるボタン ver2）
- [x] index.html にver2セクション追記（承認済みの編集）
- [x] sw.js アセット追加 + CACHE_NAME → kirakira-v4（承認済みの編集）
- [x] 検証（node --check 全通過 / ヘッドレスChromiumで全10ページ consoleエラーゼロ）
- [x] push

## Review

- 新規ファイル21本（共通基盤1 + 9ゲーム×HTML/JS）、既存の変更は index.html / sw.js の追記のみ。
- 既存9ゲームのファイルは1バイトも変更していない（git diff で確認済み）。
- ヘッドレスChromium（820×1180・タッチ）で全ver2ページを読み込み＋タップ＋ドラッグし、
  consoleエラーゼロを確認。index.html の404は /favicon.ico（従来から存在しない）で今回と無関係。
- 実機iPad Safariでの音・タッチ感度の最終確認は未実施（ローカル環境では検証不可のため）。
