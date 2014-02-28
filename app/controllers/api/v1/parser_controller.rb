require 'mechanize'

class Api::V1::ParserController < ApplicationController 
	
	$agent = Mechanize.new
    $search_tag = "p[class='story-body-text story-content']" # specific for NYTIMES



    def get_article_text(article_link)
        return $agent.get(article_link).search($search_tag).text
    end

    def get_article_word_count(article_text)
        return $agent_text.split(/\s/)
    end
end
