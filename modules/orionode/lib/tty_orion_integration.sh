#!/bin/sh
function orion() {
	printf "\33_";
	if [ $1 == "edit" ]; then
		echo "edit";
		[[ $2 = /* ]] && echo "$2" || echo "$PWD/${2#./}";
	else
		for param in "$@"; do
			echo "$param";
		done
	fi
	printf "\33\134";
	echo "Executing: $@";
}
clear;