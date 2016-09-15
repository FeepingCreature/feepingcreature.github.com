ls *.md |while read FILE
do
	TITLE=$(head -n 1 "$FILE")
	(
		sed -e "s/%TITLE%/$TITLE/g" template_pre
		tail -n +2 "$FILE" |hoedown --tables
		cat template_post
	) > ${FILE/%.md/.html}
done
ls *.tex |while read FILE
do
        TITLE=$(head -n 1 "$FILE")
        (
                sed -e "s/%TITLE%/$TITLE/g" template_pre
                tail -n +2 "$FILE" |\
                  pandoc --self-contained --webtex -f latex -t html
                cat template_post
        ) > ${FILE/%.tex/.html}
done
