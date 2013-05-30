ls *.md |while read FILE
do
	TITLE=$(head -n 1 "$FILE")
	(
		sed -e "s/%TITLE%/$TITLE/g" template_pre
		tail -n +2 "$FILE" |sundown
		cat template_post
	) > ${FILE/%.md/.html}
done
ls *.tex |while read FILE
do
        TITLE=$(head -n 1 "$FILE")
        (
                tail -n +2 "$FILE" |\
                  sed -e "s/%TITLE%/$TITLE/g" |\
                  pandoc --self-contained -s --webtex -f latex -t html
        ) > ${FILE/%.tex/.html}
done
