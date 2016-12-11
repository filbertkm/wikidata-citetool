## Query

```
SELECT ?entityLabel ?issn ?entity
WHERE
{
	?entity wdt:P236 ?issn .
	FILTER (
		 ?issn in ("1560-2745")
	)
	SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
```

## Links

* https://github.com/aurimasv/z2csl/blob/master/typeMap.xml

### Language detection

* https://www.mediawiki.org/wiki/User:TJones_(WMF)/Notes/TextCat_Improvements
* https://github.com/wikimedia/wikimedia-textcat/blob/master/TextCat.php#L171-L202
* https://github.com/dachev/node-cld
