class CreateHistories < ActiveRecord::Migration
  def change
    create_table :histories do |t|
      t.references :sources
      t.references :topics
      t.references :users
      t.text :source_article_id
      t.integer :favorites
    end
  end
end
